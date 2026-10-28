// gfx/shim.js – minimale „Galerie“-Schnittstelle, damit die Modell-Dateien (raumschiff.js, buggy.js, arbeiter.js) auch im Spiel laden
window.Gallery = window.Gallery || { objects: [], add(d) { this.objects.push(d); } };
