from typing import NamedTuple, TypeAlias

import biomeid
import mod

NPCID: TypeAlias = str


class PrefsTier(NamedTuple):
    biomes: list[biomeid.BiomeId] = []
    npcs: list[NPCID] = []


class NPC:
    id: NPCID
    mod_id: mod.Mod
    loved: PrefsTier = PrefsTier()
    liked: PrefsTier = PrefsTier()
    disliked: PrefsTier = PrefsTier()
    hated: PrefsTier = PrefsTier()

    def __init__(self, id: NPCID, mod_id: mod.Mod):
        self.id = id
        self.mod_id = mod_id

    def __repr__(self):
        return f"{self.id} ({self.mod_id})"

    def get_all_npc_ids(self):
        return self.loved.npcs + self.liked.npcs + self.disliked.npcs + self.hated.npcs
