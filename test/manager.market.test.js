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
			energyValue: 0.1,
			...overrides,
		},
	};
}

function createMarketScenario({
	hydrogen = 3000,
	terminalEnergy = 1000,
	terminalFreeCapacity = 300000,
	credits = 100000,
	orders = [],
	transactionEnergy = 25,
} = {}) {
	const marketCalls = {
		getAllOrders: 0,
		calcTransactionCost: [],
	};

	global.Game = {
		market: {
			credits,
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
				return typeof transactionEnergy === 'function'
					? transactionEnergy(amount, fromRoom, toRoom)
					: transactionEnergy;
			},
		},
	};

	const terminal = {
		room: { name: 'W1N1' },
		store: {
			[RESOURCE_HYDROGEN]: hydrogen,
			[RESOURCE_ENERGY]: terminalEnergy,
			getFreeCapacity() {
				return terminalFreeCapacity;
			},
		},
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
		'Invalid trade policy should return null when no order matches',
	);
	assert.equal(
		marketCalls.getAllOrders,
		1,
		'Should only call getAllOrders once',
	);
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
		orderId: 'lower-price',
		resourceType: RESOURCE_HYDROGEN,
		amount: 200,
		price: 0.8,
		grossCredits: 160,
		transactionEnergy: 42,
		netValue: 155.8,
	});
	assert.deepEqual(marketCalls.calcTransactionCost, [
		{
			amount: 200,
			fromRoom: 'W1N1',
			toRoom: 'W8N8',
		},
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

test('findSellTrade skips an unaffordable highest-priced order', () => {
	const { manager } = createMarketScenario({
		terminalEnergy: 100,
		orders: [
			{
				id: 'unaffordable-highest-price',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_BUY,
				amount: 200,
				price: 1,
				roomName: 'W9N9',
			},
			{
				id: 'affordable-alternative',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_BUY,
				amount: 200,
				price: 0.8,
				roomName: 'W2N2',
			},
		],
		transactionEnergy: (amount, fromRoom, toRoom) =>
			toRoom === 'W9N9' ? 101 : 25,
	});

	const trade = manager.findSellTrade(RESOURCE_HYDROGEN, createPolicy());

	assert.equal(trade.orderId, 'affordable-alternative');
});

test('findSellTrade chooses a lower-priced order with better net value', () => {
	const { manager } = createMarketScenario({
		orders: [
			{
				id: 'higher-price-higher-cost',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_BUY,
				amount: 200,
				price: 0.9,
				roomName: 'W9N9',
			},
			{
				id: 'lower-price-better-net',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_BUY,
				amount: 200,
				price: 0.85,
				roomName: 'W2N2',
			},
		],
		transactionEnergy: (amount, fromRoom, toRoom) =>
			toRoom === 'W9N9' ? 800 : 100,
	});

	const trade = manager.findSellTrade(RESOURCE_HYDROGEN, createPolicy());

	assert.equal(trade.orderId, 'lower-price-better-net');
	assert.equal(trade.netValue, 160);
});

test('findSellTrade resolves equal net values using lower transaction energy', () => {
	const { manager } = createMarketScenario({
		orders: [
			{
				id: 'higher-energy',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_BUY,
				amount: 200,
				price: 0.8,
				roomName: 'W8N8',
			},
			{
				id: 'lower-energy',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_BUY,
				amount: 200,
				price: 0.79,
				roomName: 'W2N2',
			},
		],
		transactionEnergy: (amount, fromRoom, toRoom) =>
			toRoom === 'W8N8' ? 40 : 20,
	});

	const trade = manager.findSellTrade(RESOURCE_HYDROGEN, createPolicy());

	assert.equal(trade.orderId, 'lower-energy');
	assert.equal(trade.netValue, 156);
});

test('findSellTrade returns null when all candidates have non-positive net values', (t) => {
	t.mock.method(console, 'log', () => {});
	const { manager } = createMarketScenario({
		orders: [
			{
				id: 'zero-net-value',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_BUY,
				amount: 100,
				price: 0.7,
				roomName: 'W7N7',
			},
			{
				id: 'negative-net-value',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_BUY,
				amount: 100,
				price: 0.8,
				roomName: 'W9N9',
			},
		],
		transactionEnergy: (amount, fromRoom, toRoom) =>
			toRoom === 'W7N7' ? 700 : 900,
	});

	assert.equal(
		manager.findSellTrade(RESOURCE_HYDROGEN, createPolicy()),
		null,
	);
});

test('findBuyTrade chooses the sell order with the lowest unit acquisition cost', () => {
	const { manager } = createMarketScenario({
		orders: [
			{
				id: 'lower-price-expensive-delivery',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_SELL,
				amount: 200,
				price: 0.7,
				roomName: 'W9N9',
			},
			{
				id: 'cost-effective-order',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_SELL,
				amount: 200,
				price: 0.75,
				roomName: 'W2N2',
			},
		],
		transactionEnergy: (amount, fromRoom, toRoom) =>
			toRoom === 'W9N9' ? 300 : 50,
	});

	assert.deepEqual(manager.findBuyTrade(RESOURCE_HYDROGEN, createPolicy()), {
		orderId: 'cost-effective-order',
		resourceType: RESOURCE_HYDROGEN,
		amount: 200,
		price: 0.75,
		grossCredits: 150,
		transactionEnergy: 50,
		netValue: -155,
	});
});

test('findBuyTrade skips sell orders above the maximum price', () => {
	const { manager, marketCalls } = createMarketScenario({
		orders: [
			{
				id: 'above-price-limit',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_SELL,
				amount: 200,
				price: 0.81,
				roomName: 'W2N2',
			},
			{
				id: 'within-price-limit',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_SELL,
				amount: 200,
				price: 0.8,
				roomName: 'W3N3',
			},
		],
	});

	const trade = manager.findBuyTrade(
		RESOURCE_HYDROGEN,
		createPolicy({ maximumPrice: 0.8 }),
	);

	assert.equal(trade.orderId, 'within-price-limit');
	assert.equal(marketCalls.calcTransactionCost.length, 1);
});

test('findBuyTrade skips an energy-unaffordable sell order', () => {
	const { manager } = createMarketScenario({
		terminalEnergy: 100,
		orders: [
			{
				id: 'unaffordable-cheapest-price',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_SELL,
				amount: 200,
				price: 0.7,
				roomName: 'W9N9',
			},
			{
				id: 'affordable-alternative',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_SELL,
				amount: 200,
				price: 0.8,
				roomName: 'W2N2',
			},
		],
		transactionEnergy: (amount, fromRoom, toRoom) =>
			toRoom === 'W9N9' ? 101 : 25,
	});

	const trade = manager.findBuyTrade(RESOURCE_HYDROGEN, createPolicy());

	assert.equal(trade.orderId, 'affordable-alternative');
});

test('findBuyTrade resolves equal acquisition costs using lower transaction energy', () => {
	const { manager } = createMarketScenario({
		orders: [
			{
				id: 'higher-energy',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_SELL,
				amount: 200,
				price: 0.75,
				roomName: 'W8N8',
			},
			{
				id: 'lower-energy',
				resourceType: RESOURCE_HYDROGEN,
				type: ORDER_SELL,
				amount: 200,
				price: 0.76,
				roomName: 'W2N2',
			},
		],
		transactionEnergy: (amount, fromRoom, toRoom) =>
			toRoom === 'W8N8' ? 40 : 20,
	});

	const trade = manager.findBuyTrade(RESOURCE_HYDROGEN, createPolicy());

	assert.equal(trade.orderId, 'lower-energy');
	assert.equal(trade.netValue, -154);
});
