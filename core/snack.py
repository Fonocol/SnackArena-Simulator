from collections import deque
import random
from config import GRID_HEIGHT, GRID_WIDTH
from core.point import Point
import numpy as np

ACTION = {
            "UP": (0, -1),
            "DOWN": (0, 1),
            "LEFT": (-1, 0),
            "RIGHT": (1, 0)
        }

class Snake:
    def __init__(self, start: Point, cell_size: int ,range_radius:int=10,fov_deg:int=90,etype='snake'):
        self.body = deque([start])
        # self.body = deque([start]+[Point(start.x +i, start.y) for i in range(10)])
        self.direction = "RIGHT"
        self.grow_next = False
        self.cell_size = cell_size
        
        self.facing_angle = 0.0
        
        self.range = range_radius
        self.fov = np.deg2rad(fov_deg)
        self.alive = True

    def set_direction(self, dir):
        self.direction = dir

    def head(self):
        return self.body[0]

    def move(self):
        head = self.head()
        dx, dy = ACTION[self.direction]
        
        self.facing_angle = np.arctan2(dy, dx)

        new_head = Point(head.x + dx, head.y + dy)
        self.body.appendleft(new_head)
        if not self.grow_next:
            self.body.pop()
        else:
            self.grow_next = False

    def grow(self):
        self.grow_next = True

    def is_collision(self):
        return self.head() in list(self.body)[1:]

    def to_dict(self):
        return [p.to_dict() for p in self.body]

    def _angle_diff(self, a, b):
        diff = (a - b + np.pi) % (2 * np.pi) - np.pi
        return diff
    
    def facing(self):
        return {
            "facing_angle": self.facing_angle, 
            "range": self.range,
            "fov": self.fov
            }
        
    def decide_action(self):
        directions = ['UP', 'DOWN', 'LEFT', 'RIGHT']
        action = random.choice(directions)
        return action

    
    def get_vision(self, objects):
        vision = []
        self.effective_range = self.range
        self.effective_fov = self.fov
        
        
        vec_self = self.head()
        # for body in self.body[1:]:
        #     vec = vec_self.direction_to(body)   
        #     dist = vec.length()
            
        #     if dist > self.effective_range:
        #         continue
            
        #     direction = np.arctan2(vec.y, vec.x)
        #     delta = self._angle_diff(direction, self.facing_angle)

        #     if abs(delta) <= self.effective_fov / 2:
        #         vision.append(body)
            
       
        
        for obj in objects:
            if not obj.alive:
                continue

            vec_obj = obj.position
            
            vec = vec_self.direction_to(vec_obj)   
            dist = vec.length()
            
            if dist > self.effective_range:
                continue         

            direction = np.arctan2(vec.y, vec.x)
            delta = self._angle_diff(direction, self.facing_angle)

            if abs(delta) <= self.effective_fov / 2:
                vision.append(obj)

        return vision
    
    
    def relative_position(self, point: Point):
        me = self.head()
        dx = point.x - me.x
        dy = point.y - me.y
        vec = np.array([dx, dy])
        norm = np.linalg.norm(vec)

        if norm != 0:
            dx, dy = dx / norm, dy / norm

        return {
            "haut_droite": dx > 0 and dy > 0,
            "droite": dx > 0 and dy == 0,
            "bas_droite": dx > 0 and dy < 0,
            "bas": dx == 0 and dy < 0,
            "bas_gauche": dx < 0 and dy < 0,
            "gauche": dx < 0 and dy == 0,
            "haut_gauche": dx < 0 and dy > 0,
            "haut": dx == 0 and dy > 0,
            "sur_tete": dx == 0 and dy == 0  # optionnel
        }
        
    def relative_angle(self, point: Point):
        me = self.head()
        dx = point.x - me.x
        dy = point.y - me.y
        return np.arctan2(dy, dx)  # angle en radians entre -π et π


