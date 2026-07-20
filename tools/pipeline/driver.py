#!/usr/bin/env python3
"""Compose the final QUARRY sprite strips from downloaded PixelLab frames. (#60 layouts)"""
import sys
from bake import load, xform, bake

def stalker():
    f = []
    for i in range(5):                       # 0-4 idle
        f.append((load(f"stalker/idle_{i}.png"), f"idle{i}"))
    for i in range(6):                       # 5-10 run: v3 predatory sprint
        f.append((load(f"stalker/sprint_{i}.png"), f"run{i}"))
    f.append((load("stalker/lunge_3.png"), "jump"))                       # 11 lunge/jump
    for i in range(4):                       # 12-15 wall hold: spread-limb grip rotated vertical (#65)
        f.append((xform(load(f"stalker/wallhold_{i}.png"), rot=90, tx=12), f"cling{i}"))
    f.append((xform(load("stalker/lunge_3.png"), rot=-35), "drop"))       # 16 nose-down plummet
    for i in range(4):                       # 15-18 ceiling grip, claws overlapping the tiles (#62)
        f.append((xform(load(f"stalker/ceilgrip_{i}.png"), ty=-12), f"ceil{i}"))
    f.append((load("stalker/crawl_0.png"), "land"))                       # 19 low crouch
    for i in range(4):                       # 20-23 ROAR
        f.append((load(f"stalker/roar_{i}.png"), f"roar{i}"))
    for i in range(4):                       # 24-27 ledge hang
        f.append((load(f"stalker/hang_{i}.png"), f"hang{i}"))
    f.append((load("stalker/bellycrawl2_2.png"), "crawl0"))               # 28-29 belly crawl (crouch = 28)
    f.append((load("stalker/bellycrawl2_3.png"), "crawl1"))
    f.append((load("stalker/lunge_2.png"), "rise"))                       # 30-31 jump arc phases (#62)
    f.append((load("stalker/lunge_4.png"), "fall"))
    for i in range(4):                       # slash: predatory diagonal swipe (#68)
        f.append((load(f"stalker/slash_{i}.png"), f"slash{i}"))
    for i in range(4):                       # spit: rear-back head-snap (#68)
        f.append((load(f"stalker/spit_{i}.png"), f"spit{i}"))
    for i in range(4):                       # spear: overhand hurl wind-up (#68)
        f.append((load(f"stalker/spear_{i}.png"), f"spear{i}"))
    return bake("stalker", f)

def jack():
    f = []
    for i in range(4):                       # 0-3 idle
        f.append((load(f"jack/idle_{i}.png"), f"idle{i}"))
    for i in range(8):                       # 4-11 run
        f.append((load(f"jack/run_{i}.png"), f"run{i}"))
    f.append((load("jack/jump_4.png"), "jump"))                           # 12 mid-air
    for i in range(5):                       # 13-17 ladder climb (back view)
        f.append((load(f"jack/climb_{i}.png"), f"climb{i}"))
    f.append((load("jack/jump_6.png"), "land"))                           # 18 landing crouch
    f.append((load("jack/deadhangC_2.png"), "hang0"))                     # 19-20 TWO-hand dead-hang (#69)
    f.append((load("jack/deadhangC_3.png"), "hang1"))
    f.append((load("jack/crawl_2.png"), "crawl0"))                        # 25-26 crouch (25) + crawl pair
    f.append((load("jack/crawl_3.png"), "crawl1"))
    for i in range(8):                       # 27-34 Flashback rope climb: 8-frame hand-over-hand (#67)
        f.append((load(f"jack/cableflowC_{i}.png"), f"rope{i}"))
    f.append((load("jack/jump_3.png"), "rise"))                           # 35-36 jump arc
    f.append((load("jack/jump_5.png"), "fall"))
    f.append((load("jack/leap_3.png"), "leap"))                           # 37 parkour stretch
    for i in range(8):                       # 38-45 interpolated mantle: hang -> crouch on the lip (#67)
        f.append((load(f"jack/mantleflow_{i}.png"), f"mantle{i}"))
    for i in range(4):                       # aim cycle: two-hand blaster aim + recoil beat (#67)
        f.append((load(f"jack/aim_{i}.png"), f"aim{i}"))
    for i in range(4):                       # launcher: shoulder-brace + recoil stagger (#67)
        f.append((load(f"jack/launcher_{i}.png"), f"launch{i}"))
    for i in range(4):                       # disc: sidearm throw follow-through (#67)
        f.append((load(f"jack/disc_{i}.png"), f"disc{i}"))
    for i in range(4):                       # plant: kneel + press the mine down (#67)
        f.append((load(f"jack/plant_{i}.png"), f"plant{i}"))
    for i in range(4):                       # welder: braced two-hand hold (#67)
        f.append((load(f"jack/welder_{i}.png"), f"welder{i}"))
    return bake("jack", f)

if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "both"
    if which in ("stalker", "both"):
        stalker()
    if which in ("jack", "both"):
        jack()
