import HTMmap from "./HTMmap";

const DEFAULT_LEVEL = 15;
const DEFAULT_LENGTH = 17;

//TODO find a better way to do this
const padEnd = (name: any, char: any, length: any) => {
  return name + char.repeat(length - name.length);
};
// Given 4 longitude,latitude coordinates
// that form the bounds of a rectangular area
// on the sphere, find the biggest trixel that completely encloses
// the rectangular bound defined by the four  coords

// Thanks @Kennebec
const sharedStart = (array: any[]) => {
  var A = array.concat().sort(),
    a1 = A[0],
    a2 = A[A.length - 1],
    L = a1.length,
    i = 0;
  while (i < L && a1.charAt(i) === a2.charAt(i)) i++;
  return a1.substring(0, i);
};

const trixelFromLngLatBnds = (nw: any, sw: any, se: any, ne: any, htm: any) => {
  let nw_trix = htm.lookupNameLonLat(nw.lon, nw.lat, DEFAULT_LEVEL);
  let sw_trix = htm.lookupNameLonLat(sw.lon, sw.lat, DEFAULT_LEVEL);
  let se_trix = htm.lookupNameLonLat(se.lon, se.lat, DEFAULT_LEVEL);
  let ne_trix = htm.lookupNameLonLat(ne.lon, ne.lat, DEFAULT_LEVEL);
  return sharedStart([nw_trix, sw_trix, se_trix, ne_trix]);
};

// Gets the range of trixels at level (finalLength-2)
//that are children of (name)
const getTrixelsFromParent = (name: any, finalLength: any, map: any) => {
  let startTrix = padEnd(name, "0", finalLength);
  let endTrix = padEnd(name, "3", finalLength);
  let startTrixId = map.nameToId(startTrix);
  let endTrixId = map.nameToId(endTrix);
  return {
    startTrixId: startTrixId,
    endTrixId: endTrixId
  };
};

class TrixelUtils {
  htmMap: any;
  DEFAULT_LEVEL: number;
  DEFAULT_LENGTH: number;

  constructor(htmMap: any) {
    this.htmMap = htmMap;
    this.DEFAULT_LEVEL = DEFAULT_LEVEL;
    this.DEFAULT_LENGTH = DEFAULT_LENGTH;
  }

  fetchTrixelsFromView(nw: any, sw: any, se: any, ne: any) {
    let sharedStartValue = trixelFromLngLatBnds(nw, sw, se, ne, this.htmMap);
    return getTrixelsFromParent(sharedStartValue, DEFAULT_LENGTH, this.htmMap);
  }
}

export default TrixelUtils; 