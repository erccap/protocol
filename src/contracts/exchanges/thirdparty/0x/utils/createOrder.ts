// tslint:disable:max-line-length
/*
"TODO: Remove this
ReferenceError: regeneratorRuntime is not defined
  at node_modules/@ledgerhq/hw-transport-u2f/lib/TransportU2F.js:120:50      at node_modules/@ledgerhq/hw-transport-u2f/lib/TransportU2F.js:142:6
  at Object.<anonymous> (node_modules/@ledgerhq/hw-transport-u2f/lib/TransportU2F.js:228:2)
  at Object.<anonymous> (node_modules/@0xproject/subproviders/src/index.ts:2:1)
*/
// tslint:enable:max-line-length
import {
  assetDataUtils,
  BigNumber,
  generatePseudoRandomSalt,
  signatureUtils,
} from '0x.js';
import { Order, SignedOrder } from '@0x/types';
import { constants } from '@0x/order-utils/lib/src/constants';
import { getGlobalEnvironment } from '~/utils/environment';
import { Address } from '@melonproject/token-math/address';
import {
  QuantityInterface,
  createQuantity,
} from '@melonproject/token-math/quantity';
import { approve, getToken } from '~/contracts/dependencies/token';
import { getLatestBlock } from '~/utils/evm';
import { add, toBI } from '@melonproject/token-math/bigInteger';
import { getAssetProxy } from '../calls/getAssetProxy';

export interface CreateOrderArgs {
  makerQuantity: QuantityInterface;
  takerQuantity: QuantityInterface;
  duration?: number;
  makerAddress?: Address;
}

const createOrder = async (
  exchange: Address,
  {
    makerQuantity,
    takerQuantity,
    duration = 24 * 60 * 60,
    makerAddress: givenMakerAddress,
  }: CreateOrderArgs,
  environment = getGlobalEnvironment(),
): Promise<Order> => {
  const makerAssetData = assetDataUtils.encodeERC20AssetData(
    makerQuantity.token.address,
  );
  const takerAssetData = assetDataUtils.encodeERC20AssetData(
    takerQuantity.token.address,
  );

  const latestBlock = await getLatestBlock(environment);

  const makerAddress = givenMakerAddress || environment.wallet.address;

  // tslint:disable:object-literal-sort-keys
  const order: Order = {
    exchangeAddress: `${exchange.toLowerCase()}`,
    makerAddress: `${makerAddress.toLowerCase()}`,
    takerAddress: constants.NULL_ADDRESS,
    senderAddress: constants.NULL_ADDRESS,
    feeRecipientAddress: constants.NULL_ADDRESS,
    expirationTimeSeconds: new BigNumber(
      add(latestBlock.timestamp, toBI(duration)).toString(),
    ),
    salt: generatePseudoRandomSalt(),
    makerAssetAmount: new BigNumber(`${makerQuantity.quantity}`),
    takerAssetAmount: new BigNumber(`${takerQuantity.quantity}`),
    makerAssetData,
    takerAssetData,
    makerFee: constants.ZERO_AMOUNT,
    takerFee: constants.ZERO_AMOUNT,
  };

  return order;
};

const approveOrder = async (
  exchange: Address,
  order: Order,
  environment = getGlobalEnvironment(),
) => {
  const erc20Proxy = await getAssetProxy(exchange);

  const makerTokenAddress = assetDataUtils.decodeERC20AssetData(
    order.makerAssetData,
  ).tokenAddress;

  const makerToken = await getToken(makerTokenAddress, environment);
  const makerQuantity = createQuantity(
    makerToken,
    order.makerAssetAmount.toString(),
  );

  await approve({ howMuch: makerQuantity, spender: erc20Proxy }, environment);
};

// This is just a reference implementation
const signOrder = async (
  order: Order,
  environment = getGlobalEnvironment(),
): Promise<SignedOrder> => {
  // const web3signature = await environment.eth.sign(
  //   orderHash,
  //   order.makerAddress,
  // );

  const signedOrder = await signatureUtils.ecSignOrderAsync(
    environment.eth.currentProvider,
    order,
    environment.wallet.address.toString(),
  );

  return signedOrder;
};

export { createOrder, signOrder, approveOrder };
