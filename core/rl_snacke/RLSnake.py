from core.snack import Snake
ACTION = {
            "UP": (0, -1),
            "DOWN": (0, 1),
            "LEFT": (-1, 0),
            "RIGHT": (1, 0)
        }

class RLSnacke(Snake):
    def __init__(self, start, cell_size, range_radius = 10, fov_deg = 90, etype='snake'):
        super().__init__(start, cell_size, range_radius, fov_deg, etype)
        self.external_action = None
        self.action_space = self._build_action_space()
        
    def _build_action_space(self):
        return [
            "UP",
            "DOWN",
            "LEFT",
            "RIGHT"    
        ]
        
    def decide_action(self):
        return self.external_action or self.action_space[0]
    