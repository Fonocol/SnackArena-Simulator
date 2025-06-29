import json
import os
from core.snack import Snake
from core.target import Target
from core.point import Point
from config import GRID_WIDTH, GRID_HEIGHT

class Env:
    def __init__(self):
        self.snake = Snake(start=Point(GRID_WIDTH // 2, GRID_HEIGHT // 2), cell_size=1)
        self.target = Target()
        self.done = False
        self.steps = []

    def step(self, direction):
        if self.done:
            return

        self.snake.set_direction(direction)
        self.snake.move()

        if self.snake.is_collision() or self._is_out_of_bounds():
            self.done = True
        elif self.snake.head() == self.target.position:
            self.snake.grow()
            self.target.respawn()

        self._record_state()

    def _is_out_of_bounds(self):
        head = self.snake.head()
        return not (0 <= head.x < GRID_WIDTH and 0 <= head.y < GRID_HEIGHT)

    def _record_state(self):
        self.steps.append({
            "snake": self.snake.to_dict(),
            "target": self.target.to_dict(),
            "done": self.done
        })

    
    def export(self, path="../data/episode_001.json"):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            json.dump(self.steps, f, indent=4)
