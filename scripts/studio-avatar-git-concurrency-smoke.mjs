// A real in-memory GitHub DAG: test an admin publishing 20 avatars while
// another writer pushes code, another avatar batch, or the PATCH response is lost.
import assert from 'node:assert/strict';
import {commitStudioAvatarBatch,isNonFastForward} from '../src/game/ui/studioAvatarGitPublish.mjs';
const sha=n=>n.toString(16).padStart(40,'0');
function makeGithub({conflict=null,repeat=false}={}){
  let id=10,head=sha(1),moves=0;
  const trees=new Map([[sha(2),[]]]);
  const commits=new Map([[head,{tree:{sha:sha(2)}}]]);
  const record=(paths,parent=head)=>{
    const treeSha=sha(++id);
    trees.set(treeSha,paths.map(x=>({...x})));
    const commitSha=sha(++id);
    commits.set(commitSha,{tree:{sha:treeSha},parent});
    return commitSha;
  };
  const withConcurrent=()=>{
    const current=trees.get(commits.get(head).tree.sha);
    const file=conflict==='avatar'?
      {path:'studio/assets/avatars/avatar_0001.webp',sha:sha(7),type:'blob'}:
      {path:'src/game/nonAvatarChange.mjs',sha:sha(8),type:'blob'};
    head=record([...current,file]);moves++;
  };
  const github=async(path,{method='GET',body}={})=>{
    if(method==='GET'&&path==='/git/ref/heads/main')return {object:{sha:head}};
    if(method==='GET'&&path.startsWith('/git/commits/')){
      const c=commits.get(path.slice('/git/commits/'.length));
      if(!c)throw Error('Missing mocked commit');
      return c;
    }
    if(method==='GET'&&path.startsWith('/git/trees/')){
      const key=path.slice('/git/trees/'.length).split('?')[0];
      const c=commits.get(key);
      return {truncated:false,tree:(trees.get(c?c.tree.sha:key)||[]).map(x=>({...x}))};
    }
    if(method==='POST'&&path==='/git/trees'){
      const src=trees.get(body.base_tree)||[];
      const values=new Map(src.map(x=>[x.path,x]));
      for(const row of body.tree)values.set(row.path,row);
      const treeSha=sha(++id);
      trees.set(treeSha,[...values.values()]);
      return {sha:treeSha};
    }
    if(method==='POST'&&path==='/git/commits'){
      const commitSha=sha(++id);
      commits.set(commitSha,{tree:{sha:body.tree},parent:body.parents[0]});
      return {sha:commitSha};
    }
    if(method==='PATCH'&&path==='/git/refs/heads/main'){
      if(conflict==='lost-response'){
        head=body.sha;throw Error('Network response lost');
      }
      if((conflict==='code'||conflict==='avatar')&&(moves===0||repeat)){
        withConcurrent();throw Error('Update is not a fast forward');
      }
      const c=commits.get(body.sha);
      if(!c||c.parent!==head||body.force!==false)
        throw Error('Update is not a fast forward');
      head=body.sha;
      return {object:{sha:head}};
    }
    throw Error('Unexpected mocked REST request '+method+' '+path);
  };
  return {github,getTree:()=>trees.get(commits.get(head).tree.sha),getMoves:()=>moves};
}
const content=Array.from({length:20},(_,i)=>({sha:sha(100+i),label:'Piloto '+(i+1)}));
const metadata={width:256,height:256,active:true,exclusive:false,owner:sha(99)};
for(const scenario of [null,'code','avatar','lost-response']){
  const fake=makeGithub({conflict:scenario});
  const messages=[];
  const result=await commitStudioAvatarBatch({
    github:fake.github,blobs:content,catalogIds:async()=>[],
    metadata,report:x=>messages.push(x)
  });
  assert.equal(result.rows.length,20);
  assert.equal(result.attempts,scenario==='code'||scenario==='avatar'?2:1);
  const first=scenario==='avatar'?'avatar_0002':'avatar_0001';
  assert.equal(result.rows[0].id,first);
  const final=scenario==='avatar'?'avatar_0021':'avatar_0020';
  assert.equal(result.rows[19].id,final);
  for(const row of result.rows)
    assert.ok(fake.getTree().some(file=>file.path.endsWith(row.id+'.webp')));
  if(scenario==='code')
    assert.ok(fake.getTree().some(file=>file.path.endsWith('nonAvatarChange.mjs')),
      'A concurrent source-code update must survive the avatar commit.');
  if(scenario==='avatar')
    assert.equal(fake.getTree().find(x=>x.path.endsWith('avatar_0001.webp')).sha,sha(7),
      'A concurrently published avatar must not be overwritten.');
  if(scenario==='lost-response')
    assert.equal(result.attempts,1,'Verify the branch before retrying a lost successful response.');
}
const exclusive=makeGithub();
const x=await commitStudioAvatarBatch({
  github:exclusive.github,blobs:[{sha:sha(101),label:'Fundador'}],
  metadata:{...metadata,exclusive:true},exclusiveId:'founder_abc_mw9t',
  catalogIds:async()=>[]
});
assert.equal(x.rows[0].id,'founder_abc_mw9t');
assert.equal(x.rows[0].exclusive,true);
const busy=makeGithub({conflict:'code',repeat:true});
await assert.rejects(commitStudioAvatarBatch({
  github:busy.github,blobs:content,catalogIds:async()=>[],
  metadata,maxAttempts:3
}),/cambiado demasiadas veces/);
assert.equal(busy.getMoves(),3,'Retry is bounded, never force pushes.');
assert.equal(isNonFastForward(new Error('Update is not a fast forward')),true);
assert.equal(isNonFastForward(new Error('Permission denied')),false);
console.log('STUDIO GITHUB RACE: 20 images, concurrent code, concurrent avatar, lost response, exclusive and bounded retries OK.');
