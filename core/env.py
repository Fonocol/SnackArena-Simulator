import json
import os

import numpy as np
from core.snack import Snake
from core.target import Target
from core.point import Point
from config import GRID_WIDTH, GRID_HEIGHT
from core.utils import extract_minimap_tensor
from core.rl_snacke.RLSnake import RLSnacke

class Env:
    def __init__(self):
        self.snake = RLSnacke(start=Point(GRID_WIDTH//2, GRID_HEIGHT//2), cell_size=1)
        # self.snake = Snake(start=Point(GRID_WIDTH//2, GRID_HEIGHT//2), cell_size=1)
        self.done = False
        self.steps = []
        self.targets = [Target() for _ in range(10)]
        self.objects = []
        
        self.step_count = 0
        self.minimap_save_path = "data/minimap_logs"
        
        self.appelSignal = False

    def step(self, direction=None):
        self.appelSignal = False
        
        if self.done:
            return
        
        if hasattr(self.snake, "external_action") and self.snake.external_action is not None:
            action = self.snake.external_action
            self.snake.external_action = None
        else:
            action = self.snake.decide_action()

        self.snake.set_direction(action)
        self.snake.move()
        
        # minimap = extract_minimap_tensor(self.snake, self, grid_size=64)
        # # === Sauvegarde du minimap ===
        # os.makedirs(self.minimap_save_path, exist_ok=True)
        # filename = f"step_{self.step_count:05d}.npy"
        # filepath = os.path.join(self.minimap_save_path, filename)
        # np.save(filepath, minimap)

        if self.snake.is_collision() or self._is_out_of_bounds():
            self.snake.alive = False
            self.done = True
        else:
            for target in self.targets:
                if target.etype =='target' and self.snake.head() == target.position:
                    self.appelSignal = True
                    self.snake.grow()
                    target.respawn()
                    
                

        self._record_state(action)
        self.step_count += 1

    def _is_out_of_bounds(self):
        head = self.snake.head()
        return not (0 <= head.x < GRID_WIDTH and 0 <= head.y < GRID_HEIGHT)

    def _record_state(self,action):
        self.steps.append({
            "snake": self.snake.to_dict(),
            "facing": self.snake.facing(),
            "targets": [target.to_dict() for target in self.targets],
            "objects": [obj.to_dict() for obj in self.objects],
            "done": self.done,
            "action":action,
        })

    
    def export(self, path="../data/episode_001.json"):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            json.dump(self.steps, f, indent=4)


