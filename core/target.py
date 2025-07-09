import random
from core.point import Point
from config import GRID_WIDTH, GRID_HEIGHT

class Target:
    def __init__(self,etype='target'):
        self.position = self.generate()        
        self.etype = etype
        
        self.alive = True

    def generate(self):
        return Point(random.randint(0, GRID_WIDTH - 1), random.randint(0, GRID_HEIGHT - 1))

    def respawn(self):
        self.position = self.generate()

    def to_dict(self):
        return self.position.to_dict()


