StructureTerminal.prototype.findTrade =
    function() {
        /* for (resource in this.store) {
            console.log(resource + ", " + this.store.getUsedCapacity(resource));
        } */
      if (this.store[RESOURCE_ENERGY] >= 2000 && this.store[RESOURCE_HYDROGEN] >= 2000) {
          var orders = Game.market.getAllOrders(order => order.resourceType == RESOURCE_HYDROGEN && order.type == ORDER_BUY &&
          Game.market.calcTransactionCost(200, this.room.name, order.roomName) < 400);
          console.log('Hydrogen buy orders found: ' + orders.length);
          orders.sort(function(a,b){return b.price - a.price;});
          console.log('Best price: ' + orders[0].price);
          if (orders[0].price > 0.7) {
              var result = Game.market.deal(orders[0].id, 200, this.room.name);
              if (result == 0) {
                  console.log('Order completed successfully');
              }
          }
      }
    };
