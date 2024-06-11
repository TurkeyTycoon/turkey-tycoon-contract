import { Wallet } from 'ethers';
import { createLocaleCounts } from './createLocaleAccounts';

test('createLocaleCounts', () => {
    const accounts=createLocaleCounts('ton');
    console.log(accounts);
})