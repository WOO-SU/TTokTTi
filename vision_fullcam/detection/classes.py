# vision/detection/classes.py
from enum import Enum

class DetLabel(str, Enum):
    PERSON = "person"
    LADDER = "ladder"
    HELMET = "helmet"
    VEST = "safety_vest"
    SHOES = "safety_shoes"
    OUTTRIGGER = "outtrigger"
