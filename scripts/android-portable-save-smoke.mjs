import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const java=read('android/app/src/main/java/com/craftracestudio/topdownrace/TdrPortableSavePlugin.java');
const activity=read('android/app/src/main/java/com/craftracestudio/topdownrace/MainActivity.java');
const portable=read('src/game/social/cloudProgress.js');
const ui=read('src/game/social/cloudAccountUi.js');
const qa=read('.github/workflows/android-revenuecat-qa-apk.yml');

assert.ok(activity.indexOf('registerPlugin(TdrPortableSavePlugin.class)')>0,
  'Android activity must register the dedicated native file saver');
assert.ok(activity.indexOf('registerPlugin(TdrPortableSavePlugin.class)')<
  activity.indexOf('super.onCreate(savedInstanceState)'),
  'Capacitor must know the plugin before WebView starts');
assert.match(java,/@CapacitorPlugin\(name = "TdrPortableSave"\)/);
assert.match(java,/@PluginMethod\s+public void saveJsonFile\(PluginCall call\)/);
assert.match(java,/Intent\.ACTION_CREATE_DOCUMENT/,'system SAF save-as picker required');
assert.match(java,/Intent\.CATEGORY_OPENABLE/,'use standard Android document storage');
assert.match(java,/setType\("application\/json"\)/);
assert.match(java,/Intent\.EXTRA_TITLE/,'portable filename must be supplied');
assert.match(java,/startActivityForResult\(call, picker, "onDocumentChosen"\)/);
assert.match(java,/@ActivityCallback/);
assert.match(java,/result\.getResultCode\(\) != Activity\.RESULT_OK/,'cancellation handled');
assert.match(java,/cancelled\.put\("cancelled", true\)/);
assert.match(java,/getContentResolver\(\)\.openOutputStream\(uri, "w"\)/,
  'system-confirmed URI must receive actual file bytes');
assert.match(java,/json\.getBytes\(StandardCharsets\.UTF_8\)/);
assert.match(java,/response\.put\("saved", true\)/);
assert.ok(java.indexOf('output.flush()')<java.indexOf('response.put("saved", true)'),
  'never show saved before writing to disk');
assert.match(java,/call\.reject\("No se ha podido escribir el JSON/,'handle write errors');
assert.match(java,/parsed\.has\("format"\)/);
assert.match(java,/parsed\.has\("data"\)/);
assert.doesNotMatch(java,/WRITE_EXTERNAL_STORAGE|READ_EXTERNAL_STORAGE|requestPermissions|android\.permission/,
  'SAF requires no blanket storage permissions');
assert.doesNotMatch(java,/Log\.|console\.|localStorage|delete\(uri.*success/s,
  'never print private save contents or delete successful saves');

assert.match(portable,/registerPlugin\('TdrPortableSave'\)/);
assert.match(portable,/Capacitor\.isNativePlatform\(\)\&\&Capacitor\.getPlatform\(\)==='android'/);
assert.match(portable,/await androidPortableSave\.saveJsonFile\(\{json,filename\}\)/);
assert.match(portable,/validatedSnapshot\(snapshot\)/,'validate before opening picker');
assert.match(portable,/if\(result\?\.cancelled===true\)return \{status:'cancelled'\}/);
assert.match(portable,/if\(result\?\.saved!==true\)throw new Error/,
  'no false-positive success if native bridge fails');
assert.match(portable,/return \{status:'saved',filename:/);
assert.match(portable,/return \{status:'requested',filename\}/,
  'browser-only downloads cannot claim confirmed success');

assert.ok(ui.includes("const remote=backup?.existing===true"),
  'quick button should use remote backup if it exists');
assert.match(ui,/remote\?await exportCloudProgressJson\(\):exportLocalProgressJson\(\)/);
assert.match(ui,/await downloadPortableSave\(json,remote\?/);
assert.match(ui,/await downloadPortableSave\(exportLocalProgressJson\(\)\)/);
assert.match(ui,/await downloadPortableSave\(await exportCloudProgressJson\(\)/);
assert.match(ui,/if\(result.status==='cancelled'\)/);
assert.match(ui,/if\(result.status==='saved'\)/);
assert.doesNotMatch(ui,/Exportación JSON iniciada\. Si Android no la descarga/,
  'no optimistic fake-download banner');
assert.doesNotMatch(ui,/restoreCloudBackup\(\).*downloadPortableSave/s,
  'export code must remain independent of restore actions');
assert.doesNotMatch(portable,/localStorage\.clear\(/,'download cannot erase progress');

assert.match(qa,/TDR_CI_QA_STABLE_SIGNING/,'existing QA signer preserved');
execFileSync(process.execPath,['--check','src/game/social/cloudProgress.js']);
execFileSync(process.execPath,['--check','src/game/social/cloudAccountUi.js']);
console.log('PASS: portable JSON backup download invokes Android SAF save-as, waits for verified write, safely handles cancellation and exports remote/local separately.');
