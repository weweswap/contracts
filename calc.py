import math

def get_min_max_tick(fee_amount: int) -> tuple[int, int]:
    """
    Calculate the minimum and maximum tick for a given fee amount in Uniswap V3
    fee_amount is in basis points (e.g., 100 = 1%)
    """
    # Min tick is -887272
    # Max tick is 887272
    # These represent the min/max sqrt price ratio
    MIN_TICK = -887272
    MAX_TICK = 887272
    
    # Get tick spacing based on fee
    # Fee 100 = tick spacing 20
    TICK_SPACINGS = {
        100: 20,   # 1%
        500: 10,   # 0.05%
        3000: 60,  # 0.3%
        10000: 200 # 1%
    }
    
    tick_spacing = TICK_SPACINGS[fee_amount]
    
    # Round down min tick based on spacing
    min_tick = math.floor(MIN_TICK / tick_spacing) * tick_spacing
    
    # Round up max tick based on spacing
    max_tick = math.floor(MAX_TICK / tick_spacing) * tick_spacing
    
    return (min_tick, max_tick)

# Calculate for fee 100
min_tick, max_tick = get_min_max_tick(100)
print(f"For fee 100 (1%):")
print(f"Min tick: {min_tick}")
print(f"Max tick: {max_tick}")

# Convert ticks to prices
min_sqrt_ratio = 1.0001 ** (min_tick/2)
max_sqrt_ratio = 1.0001 ** (max_tick/2)

print(f"\nCorresponding sqrt price ratios:")
print(f"Min sqrt ratio: {min_sqrt_ratio}")
print(f"Max sqrt ratio: {max_sqrt_ratio}")