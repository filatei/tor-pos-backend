import MetaTrader5 as mt5
import time
from datetime import datetime

# Initialize MT5 connection
def initialize_mt5():
    if not mt5.initialize():
        print("Failed to initialize MT5, error code:", mt5.last_error())
        return False
    return True

# Login to Exness account
def login_mt5(account, password, server):
    authorized = mt5.login(account, password=password, server=server)
    if not authorized:
        print("Failed to login, error code:", mt5.last_error())
        return False
    print("Logged in successfully.")
    return True

# Place a buy-stop or sell-stop order
def place_pending_order(symbol, order_type, price, sl, tp, lot_size=0.01):
    request = {
        "action": mt5.TRADE_ACTION_PENDING,
        "symbol": symbol,
        "volume": lot_size,
        "type": order_type,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": 10,
        "magic": 202405,
        "comment": f"Grid Order {order_type}",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_FOK,
    }
    result = mt5.order_send(request)
    return result

# Cancel all pending orders
def cancel_all_pending_orders():
    orders = mt5.orders_get()
    for order in orders:
        mt5.OrderSend({"action": mt5.TRADE_ACTION_REMOVE, "order": order.ticket})

# Monitor and manage the grid
def run_grid_strategy(symbol, grid_step=200, tp_step=100, max_orders=10, lot_size=0.01):
    if not initialize_mt5():
        return
    
    # Replace with your Exness credentials
    if not login_mt5(account=123456, password="your_password", server="Exness-MT5"):
        return

    while True:
        try:
            # Get current price
            tick = mt5.symbol_info_tick(symbol)
            current_price = tick.ask  # For buy-stop, use ask; for sell-stop, use bid

            # Cancel all pending orders to reset the grid
            cancel_all_pending_orders()

            # Place buy-stop orders above current price
            for i in range(1, max_orders + 1):
                buy_price = current_price + (i * grid_step)
                buy_tp = buy_price + tp_step
                buy_sl = buy_price - tp_step  # Adjust SL if needed
                place_pending_order(symbol, mt5.ORDER_TYPE_BUY_STOP, buy_price, buy_sl, buy_tp, lot_size)

            # Place sell-stop orders below current price
            for i in range(1, max_orders + 1):
                sell_price = current_price - (i * grid_step)
                sell_tp = sell_price - tp_step
                sell_sl = sell_price + tp_step  # Adjust SL if needed
                place_pending_order(symbol, mt5.ORDER_TYPE_SELL_STOP, sell_price, sell_sl, sell_tp, lot_size)

            print(f"Grid updated at {datetime.now()}. Current price: {current_price}")

            # Check every 60 seconds (adjust as needed)
            time.sleep(60)

        except KeyboardInterrupt:
            print("Strategy stopped by user.")
            break
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(10)

    mt5.shutdown()

# Run the strategy
if __name__ == "__main__":
    run_grid_strategy(symbol="BTCUSD", grid_step=200, tp_step=100, max_orders=10, lot_size=0.01)