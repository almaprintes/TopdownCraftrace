// Karting Canarias 4096 · author's Track Studio teaching line, 22 Nov 2026.
// Source: trackstudio-karting-canarias-1795308139835.json, editor.catalogTrackId
// 'karting-canarias-4096'. The owner edited 14 independent Bézier nodes.
// One tiny DEV-only tangent smooth (apex-6 next handle X: 1898.2789 -> 1840)
// removes a >0.62-rad direction discontinuity. Original source file is retained
// untouched in the owner's export; this candidate is ONLY for local Realizador.
// Never modify official track JSON, timing, record IDs or LIVE 4 trajectories.
const guides=[
 ['apex-1',2434.8554,1080.6947],
 ['apex-2',1590.0072,1153.6824],
 ['apex-3',1417.0849,2472.4273],
 ['apex-4',1685.8231,2679.9340],
 ['apex-5',1976.1057,2230.9031],
 ['apex-6',1710.7693,1540.9149],
 ['apex-8',2349.1643,1489.3217],
 ['apex-9',2302.1067,2601.1268],
 ['apex-10',1672.7831,3412.4441],
 ['apex-11',1808.8531,3816.6853],
 ['apex-12',2252.7814,3463.4703],
 ['apex-13',2484.6673,3735.0433],
 ['apex-15',2562.3406,4080.8879],
 ['apex-16',2808.9674,3732.2085]
];
// Each row: x,y,handleIn.x,handleIn.y,handleOut.x,handleOut.y.
const anchors=[
 [2808.9674,3732.2085,2801.5122,3971.6338,2803.8906,3612.7324],
 [2434.8554,1080.6947,2609.2916,1310.7616,2048.3367,722.0069],
 [1590.0072,1153.6824,1698.4393,959.0049,1495.9033,1420.0013],
 [1418.8752,2357.8490,1420.0828,2020.8201,1427.1537,2637.8953],
 [1692.9843,2696.9417,1556.4805,2766.8722,1842.9960,2619.1113],
 [1934.0340,2197.7828,1979.6847,2383.5997,1772.7027,1957.3382],
 [1710.7693,1540.9149,1754.9597,1746.9091,1840.0000,1208.0545],
 [2367.1582,1674.9973,2254.4042,1289.8343,2424.4704,1907.9270],
 [2260.9302,2739.8740,2320.8075,2589.9015,2169.7228,2931.9181],
 [1672.7831,3412.4441,1717.6887,3301.7802,1577.0502,3608.4978],
 [1792.7405,3827.4270,1695.2556,3788.3160,2135.6337,3892.2268],
 [2252.7814,3463.4703,1983.3285,3522.1474,2354.8733,3506.1419],
 [2473.9256,3788.7519,2502.9929,3570.1295,2371.3481,4004.8847],
 [2562.3406,4080.8879,2470.6341,4062.9552,2723.8682,4049.5877]
];
export const KARTING_CANARIAS_AI_AUTHORING_ID='karting-canarias-4096';
export const KARTING_CANARIAS_AI_SOURCE_SHA='1c3e92545c12e0b9941f10e81f8ca6c58e233c909e59005c465507d3b90bc086';
export const KARTING_CANARIAS_AI_GUIDES=Object.freeze({version:1,
 points:guides.map(([id,x,y])=>({id,x,y,kind:'apex',direction:'forward',
 radiusPx:39.6,strength:.65}))});
export const KARTING_CANARIAS_AI_BEZIER=Object.freeze({version:1,closed:true,
 nodes:anchors.map(([x,y,ix,iy,ox,oy])=>({x,y,
 handleIn:{x:ix,y:iy},handleOut:{x:ox,y:oy}}))});
