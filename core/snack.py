from collections import deque
from config import GRID_HEIGHT, GRID_WIDTH
from core.point import Point

class Snake:
    def __init__(self, start: Point, cell_size: int):
        self.body = deque([start]+[Point(GRID_WIDTH // 2+i, GRID_HEIGHT // 2) for i in range(5)])
        self.direction = "RIGHT"
        self.grow_next = False
        self.cell_size = cell_size

    def set_direction(self, dir):
        self.direction = dir

    def head(self):
        return self.body[0]

    def move(self):
        head = self.head()
        dx, dy = {
            "UP": (0, -1),
            "DOWN": (0, 1),
            "LEFT": (-1, 0),
            "RIGHT": (1, 0)
        }[self.direction]

        new_head = Point(head.x + dx, head.y + dy)
        self.body.appendleft(new_head)
        if not self.grow_next:
            self.body.pop()
        else:
            self.grow_next = False

    def grow(self):
        self.grow_next = True

    def is_collision(self):
        pass
        #return self.head() in list(self.body)[1:]

    def to_dict(self):
        return [p.to_dict() for p in self.body]
