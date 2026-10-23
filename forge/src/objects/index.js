// Objekt-Registry. Neue Objekte: Datei anlegen, hier eintragen – die Oberfläche erzeugt Liste und Regler selbst.
// Reihenfolge hier = Reihenfolge in der Liste (nach Kategorie gruppiert).
import domeHouse from './domeHouse.js';
import condenserTower from './condenserTower.js';
import duneBuggy from './duneBuggy.js';
import hoverSkiff from './hoverSkiff.js';
import wanderer from './wanderer.js';
import utilityDroid from './utilityDroid.js';
import supplyPile from './supplyPile.js';
import wreckedHull from './wreckedHull.js';
import { hq, conveyor, refinery, harvester, dewCatcher, solarField } from './base1.js';
import { battery, factory, sandDriller, smelter, crystalDepot } from './base2.js';
import { barracks, warrior, crawler, turret, shieldGen } from './defense1.js';
import { spaceport, relay, radar, lab, torchTower } from './defense2.js';
import { tamedWorm, sandworm } from './worm.js';
import { raider, tank, breaker, nightAliens, laserDrone, fortress } from './enemies.js';
import { adobeHouse, stackHouse, tenement, shack, tent, ruin } from './townHomes.js';
import { stall, cantina, shop, workshop, warehouse, hangar, watchTower, spire, waterTower, cistern, fountain, well, monument } from './townCivic.js';
import { wallSection, wallTower, gate, crates, barrels, junkPile, bench, cart, signpost, powerPole, banner, sandbags, streetLamp, pipeRun, scrub, rocks, barricade, brazier } from './townWall.js';
import { testCourse } from './test.js';

// Die 29 Spielmodelle (Basis & Wirtschaft · Verteidigung & Truppen · Gegner & Kreaturen)
export const OBJECTS = {
  hq, conveyor, refinery, harvester, dewCatcher, solarField, battery, factory, sandDriller, smelter, crystalDepot,
  barracks, warrior, crawler, turret, shieldGen, tamedWorm, spaceport, relay, radar, lab, torchTower,
  raider, tank, breaker, sandworm, nightAliens, laserDrone, fortress,
  // Stadt-Baukasten (Häuser, Gewerbe, Mauer, Straßenmobiliar) – Bausteine der Stadt
  adobeHouse, stackHouse, tenement, shack, tent, ruin,
  stall, cantina, shop, workshop, warehouse, hangar, watchTower, spire, waterTower, cistern, fountain, well, monument,
  wallSection, wallTower, gate, crates, barrels, junkPile, bench, cart, signpost, powerPole, banner, sandbags, streetLamp, pipeRun, scrub, rocks, barricade, brazier,
  // frühere Beispielobjekte (Kategorien Gebäude / Fahrzeuge / Figuren / Requisiten)
  domeHouse, condenserTower, duneBuggy, hoverSkiff, wanderer, utilityDroid, supplyPile, wreckedHull,
};
export const TEST_OBJECTS = { testCourse };
