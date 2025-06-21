import datetime
import os
import time
from pathlib import Path
from typing import TypeAlias

import bs4
import requests

import biomeid
import mod
import npc

NPCDict: TypeAlias = dict[npc.NPCID, npc.NPC]

cache_folder = Path(__file__).parent / ".cache"
if not cache_folder.exists():
    cache_folder.mkdir()


def cache_needs_update(cache_file: Path) -> bool:
    if not cache_file.exists():
        return True
    mtime = cache_file.stat().st_mtime
    now = datetime.datetime.now()
    current_time = time.mktime(now.timetuple())
    return current_time - mtime > 60 * 60 * 24  # 1 Day


def get_html_for_url(url: str, filename: str) -> str:
    cache_file = cache_folder / filename
    if cache_needs_update(cache_file):
        content = str(requests.get(url).content)
        os.makedirs(cache_file.parent, exist_ok=True)
        with open(cache_file, "w") as cache_handle:
            cache_handle.write(content)
        return content
    with open(cache_file, "r") as cache_handle:
        return cache_handle.read()


def get_bs_for_url(url: str, filename: str) -> bs4.BeautifulSoup:
    return bs4.BeautifulSoup(get_html_for_url(url, filename), features="html.parser")


def parse_living_prefs_row(
    table_row: bs4.Tag | bs4.NavigableString | None,
) -> npc.PrefsTier:
    assert isinstance(table_row, bs4.Tag)
    tds = table_row.find_all("td")
    assert len(tds) >= 2
    biomes: list[biomeid.BiomeId] = []
    npcs: list[npc.NPCID] = []
    for link in tds[0].find_all("a"):
        if len(link.text) > 0:
            if link.text == "Cavern":
                biomes.append(biomeid.BiomeId("Caverns"))
            else:
                biomes.append(biomeid.BiomeId(link.text))
    for link in tds[1].find_all("a"):
        if len(link.text) > 0:
            npcs.append(link.text)
    return npc.PrefsTier(biomes, npcs)


def parse_living_prefs_table(
    table: bs4.Tag | bs4.NavigableString | None,
) -> tuple[npc.PrefsTier, npc.PrefsTier, npc.PrefsTier, npc.PrefsTier]:
    assert isinstance(table, bs4.Tag)
    love = parse_living_prefs_row(table.find("tr", class_="love"))
    like = parse_living_prefs_row(table.find("tr", class_="like"))
    dislike = parse_living_prefs_row(table.find("tr", class_="dislike"))
    hate = parse_living_prefs_row(table.find("tr", class_="hate"))
    return (love, like, dislike, hate)


def scrape_terraria_npcs() -> NPCDict:
    npc_links: dict[npc.NPCID, str] = {}
    npcs_url = "https://terraria.wiki.gg/wiki/NPCs"
    npcs_bs = get_bs_for_url(npcs_url, "terraria/_npcs.html")
    pre_hardmode = npcs_bs.find("h3", text="Pre-Hardmode")
    hardmode = npcs_bs.find("h3", text="Hardmode")
    for heading in [pre_hardmode, hardmode]:
        assert isinstance(heading, bs4.Tag)
        table = heading.find_next("table")
        assert isinstance(table, bs4.Tag)
        for row in table.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) > 1:
                link = cells[1].find("a")
                npc_links[link.text] = link.attrs["href"]
    npcs: NPCDict = {}
    for npc_name, npc_url in npc_links.items():
        n = npc.NPC(npc_name, mod.Mod.Terraria)
        safe_name = npc_url.replace("/wiki/", "")
        npc_bs = get_bs_for_url(
            f"https://terraria.wiki.gg{npc_url}", f"terraria/{safe_name}.html"
        )
        living_prefs = npc_bs.find("table", class_="living-preferences")
        if npc_name != "Princess":
            n.loved, n.liked, n.disliked, n.hated = parse_living_prefs_table(
                living_prefs
            )
        npcs[npc_name] = n
    return npcs


def scrape_bosses_as_npcs_npcs():
    npc_links: dict[npc.NPCID, str] = {}
    npcs_url = "https://terrariamods.wiki.gg/wiki/Bosses_As_NPCs"
    npcs_bs = get_bs_for_url(npcs_url, "ban/_npcs.html")

    def find_town_npcs(tag: bs4.Tag) -> bool:
        return tag.name == "div" and tag.text == "Town NPCs"

    town_npcs_heading = npcs_bs.find(find_town_npcs)
    assert isinstance(town_npcs_heading, bs4.Tag)
    town_npcs_table = town_npcs_heading.find_next("table")
    assert isinstance(town_npcs_table, bs4.Tag)
    for link in town_npcs_table.find_all("a"):
        if len(link.text) > 0:
            npc_links[link.text] = link.attrs["href"]
    npcs: NPCDict = {}
    for npc_name, npc_url in npc_links.items():
        n = npc.NPC(npc_name, mod.Mod.BossesAsNPCs)
        safe_name = npc_url.replace("/wiki/Bosses_As_NPCs/", "")
        npc_bs = get_bs_for_url(
            f"https://terrariamods.wiki.gg{npc_url}", f"ban/{safe_name}.html"
        )
        living_prefs = npc_bs.find("table", class_="living-preferences")
        n.loved, n.liked, n.disliked, n.hated = parse_living_prefs_table(living_prefs)
        npcs[npc_name] = n
    return npcs


def scrape_fargo_npcs() -> NPCDict:
    # Too annoying to parse the fargo website so screw it
    lumberjack = npc.NPC("LumberJack", mod.Mod.Fargo)
    lumberjack.loved = npc.PrefsTier([biomeid.BiomeId.Forest], [])
    lumberjack.liked = npc.PrefsTier([], ["Squirrel"])
    lumberjack.disliked = npc.PrefsTier([], ["Dryad"])
    lumberjack.hated = npc.PrefsTier([], ["Demolitionist"])

    deviantt = npc.NPC("Deviantt", mod.Mod.Fargo)
    deviantt.loved = npc.PrefsTier([biomeid.BiomeId.Space], ["Mutant"])
    deviantt.liked = npc.PrefsTier([biomeid.BiomeId.Jungle], ["Abominationn"])
    deviantt.disliked = npc.PrefsTier([biomeid.BiomeId.Snow], ["Zoologist"])
    deviantt.hated = npc.PrefsTier([biomeid.BiomeId.Desert], ["Angler"])

    abominationn = npc.NPC("Abominationn", mod.Mod.Fargo)
    abominationn.loved = npc.PrefsTier([biomeid.BiomeId.Space], ["Mutant"])
    abominationn.liked = npc.PrefsTier([biomeid.BiomeId.Ocean], ["Deviantt"])
    abominationn.disliked = npc.PrefsTier([biomeid.BiomeId.Dungeon], [])
    abominationn.hated = npc.PrefsTier([], ["Nurse"])

    mutant = npc.NPC("Mutant", mod.Mod.Fargo)
    mutant.loved = npc.PrefsTier([biomeid.BiomeId.Space], ["Abominationn"])
    mutant.liked = npc.PrefsTier([biomeid.BiomeId.Forest], ["Deviantt"])
    mutant.disliked = npc.PrefsTier([biomeid.BiomeId.Hallow], ["Lumberjack"])
    mutant.hated = npc.PrefsTier([], [])

    squirrel = npc.NPC("Squirrel", mod.Mod.Fargo)
    squirrel.loved = npc.PrefsTier([biomeid.BiomeId.Forest], [])
    squirrel.liked = npc.PrefsTier([], ["LumberJack"])
    squirrel.disliked = npc.PrefsTier([], [])
    squirrel.hated = npc.PrefsTier(
        [
            biomeid.BiomeId.Underground,
            biomeid.BiomeId.Caverns,
            biomeid.BiomeId.Underworld,
        ],
        [],
    )
    return {n.id: n for n in [lumberjack, deviantt, abominationn, mutant, squirrel]}
