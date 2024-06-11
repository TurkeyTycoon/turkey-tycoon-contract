// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "./IReceiverAdmin.sol";
import "../common/IPriceFeeder.sol";
import "./IReferral.sol";
import "./UniswapSupport.sol";
import "./IFairMint.sol";

contract FairMint is UniswapSupport, IFairMint {
    uint96 public constant CONFIRM_GAS = 360_000;

    uint96 public maxMintSupply = 20 * 10 ** 26;
    uint public totalMinted = 0;

    uint64 public startTimestamp = 0;
    uint32 public duration = 180 days;

    uint32 public durationForWaitingLockLiquidity = 7 days;

    uint public extraUsdGas = 10 ** 16; //0.01

    uint32 public mintSuccessRatePPB = uint32(1E9) / 3; // 1/3
    uint32 public failedDeductRatePPB = uint32(1E9) / 50; // 2%
    uint32 public successDeductRatePPB = uint32(1E9) / 2; // 50%

    uint32 public level1RewardRatePPB = 3 * 1E7; //3%;
    uint32 public level2RewardRatePPB = 1 * 1E7; //1%;
    bool public needReferralActived = true;
    IReferral public referral;

    IPriceFeeder public ethUsdPriceFeeder;
    IReceiverAdmin public ethReceiverAdmin;

    Premint[] internal premints;
    uint internal _from;
    uint internal _to;

    uint64 public finishedAt = 0;

    bool public enabled = false;

    mapping(address => Account) internal _accounts;

    event MintSuccess(
        address indexed sender,
        address token,
        uint tokenAmount,
        uint extraGasFee,
        uint confirmGasFee
    );

    event Preminted(
        address indexed msgSender,
        uint64 confirmBlockNumber,
        uint extraGasFee,
        uint confirmGasFee,
        uint expectMintAmount
    );
    event MintFailed(
        address indexed sender,
        uint deductedEth,
        uint extraGasFee,
        uint confirmGasFee
    );

    event ConfirmMinted(
        address indexed sender,
        uint premintCount,
        uint totalConfirmGasFee
    );

    error NoEthReceiverFound();
    error FairMintNotStarted();
    error MintQuotaUsedUp();
    error FairMintExpired();
    error MsgValueTooLow();
    error NeedReferralActived();
    error PremintsIsEmpty();
    error NeedWaittingForBlocks();
    error LogicError();
    error NotEnabled();

    error ConfirmGasFeeTooLow();
    error ExpectMintAmountIsZero();

    constructor(
        address initialToken,
        address initialEthUsdPriceFeeder,
        address initialEthReceiverAdmin,
        address initialUniswapPositionManager,
        address multiSignAdmin
    )
        UniswapSupport(
            initialToken,
            initialUniswapPositionManager,
            multiSignAdmin
        )
    {
        _setEthUsdPriceFeeder(initialEthUsdPriceFeeder);
        _setEthReceiverAdmin(initialEthReceiverAdmin);
    }

    function calcNeedPayEth(uint mintAmount) public view returns (uint) {
        uint8 exp = 18 - ethUsdPriceFeeder.decimals();
        uint priceWei = uint(ethUsdPriceFeeder.latestAnswer()) * 10 ** exp;
        return
            Math.mulDiv(mintAmount, extraUsdGas, priceWei, Math.Rounding.Ceil);
    }

    function calcMintAmount(uint ethValue) public view returns (uint) {
        uint8 exp = 18 - ethUsdPriceFeeder.decimals();
        uint priceWei = uint(ethUsdPriceFeeder.latestAnswer()) * 10 ** exp;
        return Math.mulDiv(ethValue, priceWei, extraUsdGas);
    }

    function _getEthReceiver(uint rand) internal view returns (address) {
        uint ethReceiverCount = ethReceiverAdmin.getReceiverCount();
        if (ethReceiverCount == 0) {
            revert NoEthReceiverFound();
        }
        return ethReceiverAdmin.getReceiverAt(rand % ethReceiverCount);
    }

    function premint(
        uint expectMintAmount,
        uint confirmGasFee
    ) external payable {
        if (!enabled) {
            revert NotEnabled();
        }

        _confirmMint(true);

        if (confirmGasFee < CONFIRM_GAS * tx.gasprice) {
            revert ConfirmGasFeeTooLow();
        }

        if (expectMintAmount < 1) {
            revert ExpectMintAmountIsZero();
        }

        uint extraGasFee = calcNeedPayEth(expectMintAmount);
        if (msg.value < extraGasFee + confirmGasFee) {
            revert MsgValueTooLow();
        }
        if (block.timestamp <= startTimestamp) {
            revert FairMintNotStarted();
        }
        if (totalMinted >= maxMintSupply) {
            revert MintQuotaUsedUp();
        }
        if (block.timestamp >= startTimestamp + duration) {
            revert FairMintExpired();
        }
        address p1 = referral.referrals(msg.sender);
        if (p1 == address(0) && needReferralActived) {
            revert NeedReferralActived();
        }

        Premint memory p = Premint({
            msgSender: msg.sender,
            confirmBlockNumber: uint64(block.number + 1),
            extraGasFee: extraGasFee,
            confirmGasFee: confirmGasFee,
            expectMintAmount: expectMintAmount
        });

        uint refund = msg.value - confirmGasFee - extraGasFee;
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }

        _addPremint(p);
        emit Preminted(
            p.msgSender,
            p.confirmBlockNumber,
            p.extraGasFee,
            p.confirmGasFee,
            p.expectMintAmount
        );
    }

    function _addPremint(Premint memory p) internal virtual {
        uint len = premints.length;
        if (len > _to) {
            premints[_to] = p;
            _to += 1;
        } else if (len == _to) {
            premints.push(p);
            _to += 1;
        } else {
            revert LogicError();
        }
    }

    function confirmMint() external {
        _confirmMint(false);
    }

    function _confirmMint(bool noRevert) internal {
        if (_from == _to) {
            if (!noRevert && _tryFinish()) {
                return;
            }

            if (noRevert) {
                return;
            }
            revert PremintsIsEmpty();
        }

        uint totalConfirmGasFee = 0;
        uint premintCount = 0;

        uint i = _from;
        for (; i < _to; i++) {
            Premint memory p = premints[i];
            if (p.confirmBlockNumber < block.number) {
                totalConfirmGasFee += p.confirmGasFee;
                premintCount += 1;
                _mint(p);
            } else if (i == _from) {
                if (noRevert) {
                    return;
                }
                revert NeedWaittingForBlocks();
            } else {
                _from = i;
                break;
            }
        }
        payable(msg.sender).transfer(totalConfirmGasFee);
        if (i >= _to) {
            _from = 0;
            _to = 0;
        }
        emit ConfirmMinted(msg.sender, premintCount, totalConfirmGasFee);

        if (!noRevert) {
            _tryFinish();
        }
    }

    function _tryFinish() internal returns (bool finished) {
        if (
            finishedAt == 0 &&
            _from == _to &&
            enabled &&
            address(this).balance > 0 &&
            (totalMinted >= maxMintSupply ||
                block.timestamp >= startTimestamp + duration)
        ) {
            _addLiquidity();
            finishedAt = uint64(block.timestamp);
            return true;
        }
        return false;
    }

    function _mint(Premint memory p) internal virtual {
        bool succ = uint256(blockhash(p.confirmBlockNumber)) % 1E9 <
            mintSuccessRatePPB;
        if (succ) {
            _mintSucc(p);
        } else {
            _mintFailed(p);
        }
    }

    function _mintSucc(Premint memory p) internal {
        address account = p.msgSender;
        uint extraGasFee = p.extraGasFee;
        if (totalMinted >= maxMintSupply) {
            payable(account).transfer(extraGasFee);
            return;
        }
        uint mintAmount = p.expectMintAmount;
        if (totalMinted + mintAmount > maxMintSupply) {
            uint refund = ((mintAmount + totalMinted - maxMintSupply) *
                extraGasFee) / mintAmount;
            mintAmount = maxMintSupply - totalMinted;
            payable(account).transfer(refund);
            extraGasFee -= refund;
        }

        token.mint(account, mintAmount);
        totalMinted += mintAmount;
        uint deductedEth = (extraGasFee * successDeductRatePPB) / 1E9;

        uint k = uint160(account) + gasleft() + block.prevrandao;
        payable(_getEthReceiver(k)).transfer(extraGasFee - deductedEth);

        Record storage r0 = _accounts[account].r0;
        r0.mintedAmount += mintAmount;
        r0.successCount += 1;
        r0.successEthAmount += extraGasFee;
        address p1 = referral.referrals(account);
        if (p1 != address(0)) {
            Record storage r1 = _accounts[p1].r1;
            r1.mintedAmount += mintAmount;
            r1.successCount += 1;
            r1.successEthAmount += extraGasFee;

            address p2 = referral.referrals(p1);
            if (p2 != address(0)) {
                Record storage r2 = _accounts[p2].r2;
                r2.mintedAmount += mintAmount;
                r2.successCount += 1;
                r2.successEthAmount += extraGasFee;
            }
        }
        emit MintSuccess(
            account,
            address(token),
            mintAmount,
            extraGasFee,
            p.confirmGasFee
        );
    }

    function _mintFailed(Premint memory p) internal {
        address account = p.msgSender;
        uint extraGasFee = p.extraGasFee;
        uint deductedEth = (extraGasFee * failedDeductRatePPB) / 1E9;
        payable(account).transfer(extraGasFee - deductedEth);

        Record storage r0 = _accounts[account].r0;
        r0.failedCount += 1;
        r0.failedEthAmount += deductedEth;
        address p1 = referral.referrals(account);
        if (p1 != address(0)) {
            Record storage r1 = _accounts[p1].r1;
            r1.failedCount += 1;
            r1.failedEthAmount += deductedEth;
            address p2 = referral.referrals(p1);
            if (p2 != address(0)) {
                Record storage r2 = _accounts[p2].r2;
                r2.failedCount += 1;
                r2.failedEthAmount += deductedEth;
            }
        }
        emit MintFailed(account, deductedEth, extraGasFee, p.confirmGasFee);
    }

    function liquidityLocked() public view override returns (bool) {
        return
            finishedAt > 0 &&
            finishedAt + durationForWaitingLockLiquidity < block.timestamp;
    }

    function getPremintCount() public view returns (uint) {
        return _to - _from;
    }

    function getAllPremints() public view returns (Premint[] memory) {
        uint len = _to - _from;
        Premint[] memory ps = new Premint[](len);
        for (uint i = 0; i < len; i++) {
            ps[i] = premints[i + _from];
        }
        return ps;
    }

    function getAccountData(
        address account
    ) public view returns (AccountData memory data) {
        Account memory a = _accounts[account];
        data.owner = account;
        data.r0 = a.r0;
        data.r1 = a.r1;
        data.r2 = a.r2;
        data.r1Amount = (a.r1.mintedAmount * level1RewardRatePPB) / 1E9;
        data.r2Amount = (a.r2.mintedAmount * level2RewardRatePPB) / 1E9;
        data.totalAmount = data.r1Amount + data.r2Amount;
        data.endBlock = uint64(block.number);
        data.endTimestamp = uint64(block.timestamp);
    }

    function setDurationForWaitingLockLiquidity(
        uint32 newValue
    ) external onlyMultiSignAuthorized {
        require(newValue <= 30 days, "Exceeds 30 days");
        durationForWaitingLockLiquidity = newValue;
    }

    function setMintSuccessRatePPB(
        uint32 newMintSuccessRatePPB
    ) external onlyMultiSignAuthorized {
        mintSuccessRatePPB = newMintSuccessRatePPB;
    }

    function setFailedDeductRatePPB(
        uint32 newFailedDeductRatePPB
    ) external onlyMultiSignAuthorized {
        failedDeductRatePPB = newFailedDeductRatePPB;
    }

    function setSuccessDeductRatePPB(
        uint32 newSuccessDeductRatePPB
    ) external onlyMultiSignAuthorized {
        successDeductRatePPB = newSuccessDeductRatePPB;
    }

    function _setEthUsdPriceFeeder(address newPriceFeeder) internal {
        ethUsdPriceFeeder = IPriceFeeder(newPriceFeeder);
    }

    function setEthUsdPriceFeeder(
        address newPriceFeeder
    ) external onlyMultiSignAuthorized {
        _setEthUsdPriceFeeder(newPriceFeeder);
    }

    function _setEthReceiverAdmin(address newReceiverAdmin) internal {
        ethReceiverAdmin = IReceiverAdmin(newReceiverAdmin);
    }

    function setEthReceiverAdmin(
        address newReceiverAdmin
    ) external onlyMultiSignAuthorized {
        _setEthReceiverAdmin(newReceiverAdmin);
    }

    function setStartTimestamp(
        uint64 timestamp
    ) external onlyMultiSignAuthorized {
        startTimestamp = timestamp;
    }

    function setDuration(uint32 newDuration) external onlyMultiSignAuthorized {
        duration = newDuration;
    }

    function setExtraUsdGas(
        uint newExtraUsdGas
    ) external onlyMultiSignAuthorized {
        extraUsdGas = newExtraUsdGas;
    }

    function setReferral(address newReferral) external onlyMultiSignAuthorized {
        referral = IReferral(newReferral);
    }

    function setNeedReferralActived(
        bool needActived
    ) external onlyMultiSignAuthorized {
        needReferralActived = needActived;
    }

    function setLevel1RewardRatePPB(
        uint32 newLevel1RewordRatePPB
    ) external onlyMultiSignAuthorized {
        level1RewardRatePPB = newLevel1RewordRatePPB;
    }

    function setLevel2RewardRatePPB(
        uint32 newLevel2RewordRatePPB
    ) external onlyMultiSignAuthorized {
        level2RewardRatePPB = newLevel2RewordRatePPB;
    }

    function setMaxMintSupply(
        uint96 newMaxMintSupply
    ) external onlyMultiSignAuthorized {
        maxMintSupply = newMaxMintSupply;
    }

    function setEnabled(bool isEnabled) external onlyMultiSignAuthorized {
        enabled = isEnabled;
    }

    function mintToken() external view override returns (IMintableERC20) {
        return token;
    }
}
