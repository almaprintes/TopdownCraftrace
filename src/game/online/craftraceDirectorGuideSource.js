// TrackStudio preview exports annotations on gameTrack.aiLineGuides.
// Registered circuits place author annotations inside gameTrack.meta.
// RaceScene wraps either source in scene.track.meta = gameTrack, so
// the runtime paths intentionally differ by exactly one nesting level.
// This pure helper keeps the local Realizador in sync with both formats.
export function resolveDirectorGuideSource(runtimeTrack){
 const track=runtimeTrack?.meta;
 const direct=track?.aiLineGuides;
 const authored=track?.meta?.aiLineGuides;
 const guides=direct?.points?.length?direct:authored?.points?.length?authored:null;
 const bezier=track?.aiBezierLine||track?.meta?.aiBezierLine||null;
 return{
   guides,bezier,
   shape:track?.trackShape||null,
   dimensions:{worldW:track?.worldW,worldH:track?.worldH},
   carScale:track?.carScale??track?.meta?.carScale??1,
   source:direct?.points?.length?'trackstudio':
     authored?.points?.length?'registered-circuit':'none'
 };
}
