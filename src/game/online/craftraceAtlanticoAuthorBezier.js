// Owner export 2026-11-28; already in 70% world coordinates.
export const ATLANTICO_G_GUIDES={
  "version": 1,
  "points": [
    {
      "id": "apex-1",
      "x": 1414.9817473193984,
      "y": 1531.843347011824,
      "kind": "apex",
      "direction": "forward",
      "radiusPx": 46.97,
      "strength": 0.65
    },
    {
      "id": "apex-2",
      "x": 684.3681626793118,
      "y": 1070.6092619603644,
      "kind": "apex",
      "direction": "forward",
      "radiusPx": 46.97,
      "strength": 0.65
    },
    {
      "id": "apex-3",
      "x": 1194.1532040519778,
      "y": 624.2536957815325,
      "kind": "apex",
      "direction": "forward",
      "radiusPx": 46.97,
      "strength": 0.65
    },
    {
      "id": "apex-4",
      "x": 1461.1834638186128,
      "y": 967.2427097926345,
      "kind": "apex",
      "direction": "forward",
      "radiusPx": 46.97,
      "strength": 0.65
    },
    {
      "id": "apex-5",
      "x": 1697.6736058993274,
      "y": 573.3534996383323,
      "kind": "apex",
      "direction": "forward",
      "radiusPx": 46.97,
      "strength": 0.65
    },
    {
      "id": "apex-6",
      "x": 2376.748152739018,
      "y": 1022.0583056391577,
      "kind": "apex",
      "direction": "forward",
      "radiusPx": 46.97,
      "strength": 0.65
    }
  ]
};
export const ATLANTICO_G_ORIGINAL_BEZIER={
  "version": 1,
  "closed": true,
  "nodes": [
    {
      "x": 1414.9817473193984,
      "y": 1531.843347011824,
      "handleIn": {
        "x": 1554.9241728576224,
        "y": 1527.8286820845046
      },
      "handleOut": {
        "x": 938.2366475544983,
        "y": 1524.150967113082
      }
    },
    {
      "x": 710.0313099398533,
      "y": 1075.3366838241477,
      "handleIn": {
        "x": 743.1295157877735,
        "y": 1211.367962468615
      },
      "handleOut": {
        "x": 701.2445921636786,
        "y": 606.5635118856809
      }
    },
    {
      "x": 1202.5007298814457,
      "y": 624.4900265999779,
      "handleIn": {
        "x": 950.8366460832418,
        "y": 489.94170276975285
      },
      "handleOut": {
        "x": 1344.0834188515364,
        "y": 750.9341986637153
      }
    },
    {
      "x": 1461.1834638186128,
      "y": 967.2427097926345,
      "handleIn": {
        "x": 1378.584958193861,
        "y": 953.1453669769205
      },
      "handleOut": {
        "x": 1564.7176948401225,
        "y": 902.324572885102
      }
    },
    {
      "x": 1697.6736058993274,
      "y": 573.3534996383323,
      "handleIn": {
        "x": 1619.2386338598012,
        "y": 741.2554099820884
      },
      "handleOut": {
        "x": 1987.4918698480515,
        "y": 564.1578947216091
      }
    },
    {
      "x": 2376.748152739018,
      "y": 1022.0583056391577,
      "handleIn": {
        "x": 2401.9437287958344,
        "y": 810.330266909235
      },
      "handleOut": {
        "x": 2348.850950953111,
        "y": 1203.1679194393805
      }
    }
  ]
};
// Preserve the exact owner export above. The competition variant changes only
// four handles at anchors 4 and 5 to reduce steering discontinuities.
// All anchor coordinates, other handles and road geometry are unchanged.
const correctedHandles={
  3:{handleIn:{x:1378.3996234197607,y:980.2074301800285},handleOut:{x:1576.4880182129696,y:926.7635641904941}},
  4:{handleIn:{x:1547.8775211019515,y:682.4600040975134},handleOut:{x:1969.6583385228105,y:472.8373791015289}}
};
export const ATLANTICO_G_BEZIER={...ATLANTICO_G_ORIGINAL_BEZIER,
 nodes:ATLANTICO_G_ORIGINAL_BEZIER.nodes.map((node,index)=>({...node,...correctedHandles[index]}))};
export function matchesAtlanticoAuthorWorld(track){
 return track?.id==='circuito-atlantico'&&track.raceDirection==='forward'&&
 Math.abs(track.worldW-3040.8)<.001&&Math.abs(track.worldH-2280.6)<.001&&
 track.meta?.imageNative?.worldScale===.7&&
 track.meta?.sourceSha256==='92863db4589e6d603d7c766f1432e04aef04a772d6a4d6b89604df1c843d4a85';
}
