import numpy as np

class Point:
    def __init__(self, x: int, y: int,etype = "point"):
        self.x = x
        self.y = y
        self.etype = etype

    def __eq__(self, other):
        return isinstance(other, Point) and self.x == other.x and self.y == other.y

    def to_dict(self):
        return {"x": self.x, "y": self.y}
    
    def direction_to(self,point):
        return Point(self.x-point.x , self.y-point.y)
    
    def length(self):
        return  np.linalg.norm(np.array([self.x,self.y]))
    
    def distance_to(self, point):
        dx = self.x - point.x
        dy = self.y - point.y
        return np.hypot(dx, dy)

        
        
