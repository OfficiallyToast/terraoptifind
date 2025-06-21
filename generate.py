from pathlib import Path

import npc
import biomeid
from scrape import scrape_bosses_as_npcs_npcs


def biomes_to_jsenum(b: list[biomeid.BiomeId]):
    if len(b) == 0:
        return "None"
    return b[0].name


def npcs_to_jsenum(npcs: list[npc.NPCID]):
    return ", ".join([f'"{n}"' for n in npcs])


npcdata_js = Path(__file__).parent / "npcdata_ban.js"

npcs = scrape_bosses_as_npcs_npcs()

lines: list[str] = []
for n in npcs.values():
    if " " in n.id:
        lines.append(f'    "{n.id}": ' + "{")
    else:
        lines.append(f"    {n.id}: " + "{")
    lines.append(f"        biome_loved: Biome.{biomes_to_jsenum(n.loved.biomes)},")
    lines.append(f"        biome_liked: Biome.{biomes_to_jsenum(n.liked.biomes)},")
    lines.append(
        f"        biome_disliked: Biome.{biomes_to_jsenum(n.disliked.biomes)},"
    )
    lines.append(f"        biome_hated: Biome.{biomes_to_jsenum(n.hated.biomes)},")
    lines.append(f"        loved: [{npcs_to_jsenum(n.loved.npcs)}],")
    lines.append(f"        liked: [{npcs_to_jsenum(n.liked.npcs)}],")
    lines.append(f"        disliked: [{npcs_to_jsenum(n.disliked.npcs)}],")
    lines.append(f"        hated: [{npcs_to_jsenum(n.hated.npcs)}],")
    lines.append("        weighting: 1.0,")
    lines.append("        mod: 'BossesAsNPCs',")
    lines.append("    },")

with open(npcdata_js, "w") as generated_handle:
    generated_handle.writelines("\n".join(lines))
