import numpy as np
import math

from config import CELL_SIZE, GRID_HEIGHT, GRID_WIDTH
from core.point import Point
from core.rl_snacke.RLSnake import RLSnacke

channels = {
    "agent": 0,
    "target": 1,
    "wall": 2,
    "facing": 3,
}

channel_names = [
    "Agent", "target", "wall", "facing"
]

def bresenham_line(x0, y0, x1, y1):
    """Trace une ligne continue entre deux points avec l'algorithme de Bresenham"""
    points = []
    dx = abs(x1 - x0)
    dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy
    
    while True:
        points.append((x0, y0))
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy
    
    return points

def extract_minimap_tensor(agent, env, grid_size=64):
    tensor = np.zeros((len(channel_names), grid_size, grid_size), dtype=np.float32)

    head = agent.head()
    ax, ay = head.x, head.y
    vision_range = agent.range
    angle = agent.facing_angle
    fov = agent.fov
    center = grid_size // 2
    tensor[channels["agent"], center, center] = 1.0
    
    cell_size = (2 * vision_range) / grid_size  # world units per pixel

    def to_grid_coords(x, y):
        dx = x - ax
        dy = y - ay
        gx = round((dx + vision_range) / cell_size)
        gy = round((dy + vision_range) / cell_size)
        return gx, gy

    def within_vision(x, y):
        dx = x - ax
        dy = y - ay
        dist = math.hypot(dx, dy)
        if dist > vision_range:
            return False

        direction = math.atan2(dy, dx)
        delta = (direction - angle + np.pi) % (2 * np.pi) - np.pi
        return abs(delta) <= fov / 2

    # === 1. Corps de l'agent (sauf la tête) ===
    for part in list(agent.body)[1:]:
        if within_vision(part.x, part.y):
            gx, gy = to_grid_coords(part.x, part.y)
            if 0 <= gx < grid_size and 0 <= gy < grid_size:
                tensor[channels["agent"], gy, gx] = 1.0

    # === 2. Cibles ===
    for target in env.targets:
        if not target.alive:
            continue
        pos = target.position
        if within_vision(pos.x, pos.y):
            gx, gy = to_grid_coords(pos.x, pos.y)
            if 0 <= gx < grid_size and 0 <= gy < grid_size:
                tensor[channels["target"], gy, gx] = 1.0

    # === 3. Murs (bordures visibles sans trous) ===
    from config import GRID_WIDTH, GRID_HEIGHT
    
    def draw_border(border_points):
        prev_gx, prev_gy = None, None
        for x, y in border_points:
            if within_vision(x, y):
                gx, gy = to_grid_coords(x, y)
                if 0 <= gx < grid_size and 0 <= gy < grid_size:
                    if prev_gx is not None:
                        # Remplir les trous entre les points
                        line_points = bresenham_line(prev_gx, prev_gy, gx, gy)
                        for px, py in line_points:
                            if 0 <= px < grid_size and 0 <= py < grid_size:
                                tensor[channels["wall"], py, px] = 1.0
                    tensor[channels["wall"], gy, gx] = 1.0
                    prev_gx, prev_gy = gx, gy

    # Bordures horizontales
    top_border = [(x, 0) for x in range(GRID_WIDTH)]
    bottom_border = [(x, GRID_HEIGHT-1) for x in range(GRID_WIDTH)]
    # Bordures verticales
    left_border = [(0, y) for y in range(GRID_HEIGHT)]
    right_border = [(GRID_WIDTH-1, y) for y in range(GRID_HEIGHT)]
    
    draw_border(top_border)
    draw_border(bottom_border)
    draw_border(left_border)
    draw_border(right_border)

    # === 4. Facing direction ===
    dx = math.cos(angle)
    dy = math.sin(angle)
    for step in range(1, grid_size // 2):
        px = ax + dx * step * cell_size
        py = ay + dy * step * cell_size
        if not within_vision(px, py):
            break
        gx, gy = to_grid_coords(px, py)
        if 0 <= gx < grid_size and 0 <= gy < grid_size:
            tensor[channels["facing"], gy, gx] = 1.0

    return tensor


def danger_position(head:Point):
    up,down,right,left = False,False,False,False
    
    if head.x <= CELL_SIZE:
        left = True
    
    if head.x >=GRID_WIDTH-CELL_SIZE:
        right = True
        
    if head.y <= CELL_SIZE:
        up = True
    
    if head.y >=GRID_HEIGHT-CELL_SIZE:
        down = True
    return up,down,right,left
