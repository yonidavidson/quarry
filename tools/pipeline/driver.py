#!/usr/bin/env python3
"""Compose the final QUARRY sprite strips from downloaded PixelLab frames. (#60 layouts)"""
import sys
from bake import load, xform, bake

def stalker():
    f = []
    for i in range(8):                       # 0-7 idle
        f.append((load(f"garathe/idle_{i}.png"), f"idle{i}"))
    for i in range(8):                       # 8-15 sprint
        f.append((load(f"garathe/sprint_{i}.png"), f"run{i}"))
    f.append((load("garathe/jump_6.png"), "jump"))                        # 16 airborne stride
    for i in (0, 2, 4, 6):                  # 17-20 wall-climb contact cycle
        f.append((load(f"garathe/wall_{i}.png"), f"cling{i}"))
    f.append((load("garathe/jump_7.png"), "drop"))                        # 21 descending stride
    for i in (0, 2, 4, 6):                  # 22-25 ceiling traverse
        f.append((xform(load(f"garathe/wall_{i}.png"), rot=90), f"ceil{i}"))
    f.append((load("garathe/crawl_0.png"), "land"))                       # 26 landing crouch
    for i in (0, 2, 4, 6):                  # 27-30 roar
        f.append((load(f"garathe/roar_{i}.png"), f"roar{i}"))
    for i in range(4):                       # 31-34 overhead hang (hang4, fit within 16384px texture limit)
        f.append((load(f"garathe/hang_{i}.png"), f"hang{i}"))
    for i in range(6):                       # 35-40 low prowl (crawl4, fit within texture limit)
        f.append((load(f"garathe/crawl_{i}.png"), f"crawl{i}"))
    for i in (0, 2, 4, 6):                  # 39-42 rear-view rope climb
        f.append((load(f"garathe/rope_{i}.png"), f"rope{i}"))
    f.append((load("garathe/jump_3.png"), "rise"))                        # 43-46 air/mantle poses
    f.append((load("garathe/jump_7.png"), "fall"))
    f.append((load("garathe/jump_6.png"), "leap"))
    f.append((load("garathe/crawl_1.png"), "mantle"))
    for action in ("slash", "spit", "spear"):                           # 47-70 attacks
        for i in range(8):
            f.append((load(f"garathe/{action}_{i}.png"), f"{action}{i}"))
    for i in range(9):                                                   # 73-81 death
        f.append((load(f"garathe/death_{i}.png"), f"death{i}"))
    for i in range(7):                                                   # 82-88 landing roll
        f.append((load(f"garathe/roll_{i}.png"), f"roll{i}"))
    for i in range(7):                                                   # 89-95 super leap
        f.append((load(f"garathe/leap2_{i}.png"), f"leap2{i}"))
    for i in range(9):                                                   # 96-104 sonic shriek
        f.append((load(f"garathe/shriek_{i}.png"), f"shriek{i}"))
    for i in range(9):                                                   # 105-113 lash tongue
        f.append((load(f"garathe/tongue_{i}.png"), f"tongue{i}"))
    return bake("stalker", f, feet_y=218)

def jack():
    f = []
    for i in range(4):                       # 0-3 idle
        f.append((load(f"jack/idle_{i}.png"), f"idle{i}"))
    for i in range(8):                       # 4-11 run
        f.append((load(f"jack/run_{i}.png"), f"run{i}"))
    f.append((load("jack/jump_4.png"), "jump"))                           # 12 mid-air
    for i in range(8):                       # 13-20 posed ladder climb (back view)
        f.append((load(f"jack/climb3_{i}.png"), f"climb{i}"))
    f.append((load("jack/jump_6.png"), "land"))                           # 21 landing crouch
    for i in range(4):                       # 22-25 overhead hang (hang4, fit within 16384px texture limit)
        f.append((load(f"jack/hang_{i}.png"), f"hang{i}"))
    for i in range(4):                       # 26-29 prone crawl (crawl4, fit within texture limit)
        f.append((load(f"jack/crawl_{i}.png"), f"crawl{i}"))
    for i in range(4):                       # 30-33 posed rope climb
        f.append((load(f"jack/climb3_{i}.png"), f"rope{i}"))
    f.append((load("jack/jump_3.png"), "rise"))                           # 38-39 jump arc
    f.append((load("jack/jump_5.png"), "fall"))
    f.append((load("jack/leap_3.png"), "leap"))                           # 40 parkour stretch
    for i in range(8):                       # 41-48 interpolated mantle: hang -> crouch on the lip (#67)
        f.append((load(f"jack/mantleflow_{i}.png"), f"mantle{i}"))
    for i in range(4):                       # 49-52 aim cycle
        f.append((load(f"jack/aim_{i}.png"), f"aim{i}"))
    for i in range(4):                       # 53-56 launcher
        f.append((load(f"jack/launcher_{i}.png"), f"launch{i}"))
    for i in range(4):                       # 57-60 disc
        f.append((load(f"jack/disc_{i}.png"), f"disc{i}"))
    for i in range(4):                       # 61-64 plant
        f.append((load(f"jack/plant_{i}.png"), f"plant{i}"))
    for i in range(4):                       # 65-68 welder
        f.append((load(f"jack/welder_{i}.png"), f"welder{i}"))
    for i in range(9):                       # 69-77 death
        f.append((load(f"jack/death_{i}.png"), f"death{i}"))
    for i in range(7):                       # 78-84 landing roll
        f.append((load(f"jack/roll_{i}.png"), f"roll{i}"))
    for i in range(7):                       # 85-91 rifle attack
        f.append((load(f"jack/rifle_{i}.png"), f"rifle{i}"))
    return bake("jack", f)

if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "both"
    if which in ("stalker", "both"):
        stalker()
    if which in ("jack", "both"):
        jack()
