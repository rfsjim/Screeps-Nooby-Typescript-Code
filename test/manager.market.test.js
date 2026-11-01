const test = require('node:test');
const assert = require('node:assert/strict');

const { installScreepsGlobals } = require('./helpers/screeps');

installScreepsGlobals();

const MarketManager = require('../src/manager.market');

function createPolicy(overrides = {}) {
	return {
		[RESOURCE_HYDROGEN]: {
			enabled: true,
			reserve: 2000,
			minimumPrice: 0.7,
			maximumTradeSize: 200,
			...overrides,
		},
	};
}

function createMarketScenario({
	hydrogen = 3000,
	orders = [],
	transactionEnergy = 25,
} = {}) {
	const marketCalls = {
		getAllOrders: 0,
		calcTransactionCost: [],
	};

	global.Game = {
		market: {
			getAllOrders(filter) {
				marketCalls.getAllOrders += 1;
				return orders.filter(filter);
			},
			calcTransactionCost(amount, fromRoom, toRoom) {
				marketCalls.calcTransactionCost.push({
					amount,
					fromRoom,
					toRoom,
				});
				return transactionEnergy;
			},
		},
	};

	const terminal = {
		room: { name: 'W1N1' },
		store: { [RESOURCE_HYDROGEN]: hydrogen },
	};

	return {
		manager: new MarketManager(terminal),
		marketCalls,
	};
}

test('findSellTrade returns null when the resource has no policy', (t) => {
	t.mock.method(console, 'log', () => {});
	const { manager, marketCalls } = createMarketScenario();

	assert.equal(manager.findSellTrade(RESOURCE_HYDROGEN, {}), null);
	assert.equal(marketCalls.getAllOrders, 0);
});

test('findSellTrade returns null when the resource policy is disabled', (t) => {
	t.mock.method(console, 'log', () => {});
	const { manager, marketCalls } = createMarketScenario();

	assert.equal(
		manager.findSellTrade(
			RESOURCE_HYDROGEN,
			createPolicy({ enabled: false }),
		),
		null,
	);
	assert.equal(marketCalls.getAllOrders, 0);
});

test('findSellTrade returns null when stock does not exceed the reserve', (t) => {
	t.mock.method(console, 'log', () => {});
	const { manager, marketCalls } = createMarketScenario({ hydrogen: 2000 });

	assert.equal(
		manager.findSellTrade(RESOURCE_HYDROGEN, createPolicy()),
		null,
	);
	assert.equal(marketCalls.getAllOrders, 0);
});

test('findSellTrade returns null when no order matches the trade policy', (t) => {
	t.mock.method(console, 'log', () => {});
	const { manager, marketCalls } = createMarketScenario({
		orders: [
			{
				id: 'wrong-resource',
				resourceType: RESOURCE_ENERGY,
				type: ORDER_BUY,
				amount: 100,
				price: 1,
			},
			{
				id: 'wrong-order-type',
				resourceType: RESOURCE_HYDROGEN,
				type: 'sell',
				amount: 100,
				price: 1,
			},
			{
				id: 'empty-order',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_BUY,
				amount: 0,
				price: 1,
			},
			{
				id: 'price-below-minimum',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_BUY,
				amount: 100,
				price: 0.69,
			},
		],
	});

	assert.equal(
		manager.findSellTrade(RESOURCE_HYDROGEN, createPolicy()),
		null,
	);
	assert.equal(marketCalls.getAllOrders, 1);
});

test('findSellTrade caps a large order to the maximum trade size', () => {
	const { manager } = createMarketScenario({
		orders: [
			{
				id: 'large-order',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_BUY,
				amount: 1000,
				price: 0.8,
				roomName: 'W9N9',
			},
		],
	});

	const trade = manager.findSellTrade(RESOURCE_HYDROGEN, createPolicy());

	assert.equal(trade.amount, 200);
});

test('findSellTrade calculates every ProposedTrade field from the best order', () => {
	const { manager, marketCalls } = createMarketScenario({
		orders: [
			{
				id: 'lower-price',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_BUY,
				amount: 200,
				price: 0.8,
				roomName: 'W8N8',
			},
			{
				id: 'best-price',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_BUY,
				amount: 150,
				price: 0.9,
				roomName: 'W2N3',
			},
		],
		transactionEnergy: 42,
	});

	assert.deepEqual(manager.findSellTrade(RESOURCE_HYDROGEN, createPolicy()), {
		orderId: 'best-price',
		resourceType: RESOURCE_HYDROGEN,
		amount: 150,
		price: 0.9,
		grossCredits: 135,
		transactionEnergy: 42,
	});
	assert.deepEqual(marketCalls.calcTransactionCost, [
		{
			amount: 150,
			fromRoom: 'W1N1',
			toRoom: 'W2N3',
		},
	]);
});

test('findSellTrade caps the amount to the available surplus', () => {
	const { manager } = createMarketScenario({
		hydrogen: 2075,
		orders: [
			{
				id: 'surplus-limited-order',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_BUY,
				amount: 200,
				price: 0.8,
				roomName: 'W9N9',
			},
		],
	});

	const trade = manager.findSellTrade(RESOURCE_HYDROGEN, createPolicy());

	assert.equal(trade.amount, 75);
});
