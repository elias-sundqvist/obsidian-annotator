// Minimal host boundary for automated integration tests; never shipped.
import {StateField} from '@codemirror/state';
export const editorInfoField = StateField.define({create:()=>null,update:value=>value});
export const editorLivePreviewField = StateField.define<boolean>({ create: () => true, update: value => value });
export const Platform = {isMobile:false,isPhone:false,isTablet:false,isWin:false,isMacOS:false,isLinux:false,isDesktopApp:false};
export const Keymap = { isModEvent:(event:MouseEvent)=>event.ctrlKey || event.metaKey || event.button === 1 ? 'tab' : event.shiftKey ? 'split' : false };
export class Component { private domCleanups:(()=>void)[]=[];registerDomEvent(element:HTMLElement,type:string,fn:EventListener){element.addEventListener(type,fn);this.domCleanups.push(()=>element.removeEventListener(type,fn));} load(){} unload(){for(const cleanup of this.domCleanups.splice(0))cleanup();} addChild<T>(child:T){return child;} removeChild(_child:unknown){} }
export class Scope {
    handlers: any[] = [];
    constructor(public parent?: Scope) {}
    register(modifiers: string[] | null, key: string | null, func: (event: KeyboardEvent) => boolean | void) { const handler = { modifiers, key, func }; this.handlers.push(handler); return handler; }
    unregister(handler: any) { this.handlers = this.handlers.filter(value => value !== handler); }
}
export class View { contentEl!:HTMLElement; containerEl!:HTMLElement; app:any; }
export class FileView extends View {
    file: any;
    constructor(public leaf: any) { super(); this.contentEl = leaf.contentEl; this.containerEl = leaf.contentEl; this.app = leaf.app; }
    getState(): Record<string, unknown> { return {}; }
    async setState(state: Record<string, unknown>, _result: unknown) { if (state.file) { this.file = this.app.vault.getAbstractFileByPath(state.file); await (this as any).onLoadFile(this.file); } }
}
export class MarkdownView extends FileView {}
export class ItemView extends FileView {addChild<T>(child:T){return child;}removeChild(_child:unknown){} }
export class WorkspaceLeaf { async setViewState(state:any){(this as any).state=state;} }
export class TFile {
    stat={mtime:1,size:0}; extension:string; basename:string; name:string;
    constructor(public path:string){this.extension=path.split('.').at(-1)||'';this.name=path.split('/').at(-1)!;this.basename=this.name.replace(/\.[^.]+$/,'');}
}
/** Obsidian 1.14.4's file outside the vault; undefined (an older Obsidian) unless a test turns it on with `externalFiles`. */
export class ExternalFileStandIn extends TFile { getRealPath(){return this.path.slice(5);} }
export let TExternalFile: typeof ExternalFileStandIn | undefined = undefined;
export function externalFiles(on:boolean){TExternalFile=on?ExternalFileStandIn:undefined;}
export class Menu { items:any[]=[]; shown=0; native=true; setUseNativeMenu(on:boolean){this.native=on;return this;} addItem(build:(item:any)=>void){const item:any={title:'',checked:false,warning:false,run:()=>{}};for(const key of ['setIcon','setDisabled','setSection'])item[key]=()=>item;item.setTitle=(title:string)=>{item.title=title;return item;};item.setChecked=(on:boolean)=>{item.checked=!!on;return item;};item.setWarning=(on:boolean)=>{item.warning=!!on;return item;};item.onClick=(run:()=>void)=>{item.run=run;return item;};build(item);this.items.push(item);return this;} addSeparator(){return this;} showAtMouseEvent(_event:unknown){this.shown++;return this;} showAtPosition(_position:unknown){this.shown++;return this;} }
export class Notice { static messages:any[]=[];static shown:Notice[]=[];hidden=false;constructor(public message:any,public duration?:number){Notice.messages.push(message);Notice.shown.push(this);} hide(){this.hidden=true;} }
export class Modal {contentEl!:HTMLElement;modalEl!:HTMLElement;constructor(public app:any){}open(){}close(){} }
export class FuzzySuggestModal<T> extends Modal { emptyStateText='';limit=0;setPlaceholder(_text:string){} setInstructions(_items:unknown[]){} getItems():T[]{return [];} }
export class PluginSettingTab {containerEl!:HTMLElement;constructor(public app:any,_plugin:any){this.containerEl=(globalThis as any).document?.createElement('div');} }
// A setting row as the host builds it, as far as the dialogs under test use one: a name, a description and controls that are real elements.
export class Setting {
    settingEl!:HTMLElement; infoEl!:HTMLElement; nameEl!:HTMLElement; descEl!:HTMLElement; controlEl!:HTMLElement;
    constructor(container:HTMLElement){
        const doc=container?.ownerDocument;if(!doc)return;
        const make=(cls:string,parent:HTMLElement)=>{const el=doc.createElement('div');el.className=cls;parent.append(el);return el;};
        this.settingEl=make('setting-item',container);this.infoEl=make('setting-item-info',this.settingEl);this.nameEl=make('setting-item-name',this.infoEl);this.descEl=make('setting-item-description',this.infoEl);this.controlEl=make('setting-item-control',this.settingEl);
    }
    setName(text:string){this.nameEl.textContent=text;return this;} setDesc(text:string){this.descEl.textContent=text;return this;} setClass(name:string){this.settingEl.classList.add(name);return this;} setHeading(){this.settingEl.classList.add('setting-item-heading');return this;}
    addDropdown(build:(control:any)=>void){const selectEl=this.controlEl.ownerDocument.createElement('select');this.controlEl.append(selectEl);let changed=(_value:string)=>{};const control:any={selectEl,addOptions(options:Record<string,string>){for(const [value,text] of Object.entries(options)){const option=selectEl.ownerDocument.createElement('option');option.value=value;option.textContent=text;selectEl.append(option);}return control;},setValue(value:string){selectEl.value=value;return control;},getValue:()=>selectEl.value,onChange(fn:(value:string)=>void){changed=fn;return control;}};selectEl.addEventListener('change',()=>changed(selectEl.value));build(control);return this;}
    addSlider(build:(control:any)=>void){const sliderEl=this.controlEl.ownerDocument.createElement('input');sliderEl.type='range';this.controlEl.append(sliderEl);const control:any={sliderEl,setLimits(){return control;},setValue(value:number){sliderEl.value=String(value);return control;},setDynamicTooltip(){return control;},onChange(){return control;}};build(control);return this;}
    private field(tag:'input'|'textarea',build:(control:any)=>void){const inputEl=this.controlEl.ownerDocument.createElement(tag) as HTMLInputElement;if(tag==='input')inputEl.type='text';this.controlEl.append(inputEl);let changed=(_value:string)=>{};const control:any={inputEl,setValue(value:string){inputEl.value=value;return control;},getValue:()=>inputEl.value,setPlaceholder(value:string){inputEl.placeholder=value;return control;},onChange(fn:(value:string)=>void){changed=fn;return control;}};inputEl.addEventListener('input',()=>changed(inputEl.value));build(control);return this;}
    addText(build:(control:any)=>void){return this.field('input',build);} addTextArea(build:(control:any)=>void){return this.field('textarea',build);}
    addToggle(build:(control:any)=>void){const toggleEl=this.controlEl.ownerDocument.createElement('div');toggleEl.className='checkbox-container';this.controlEl.append(toggleEl);let on=false,off=false,changed=(_value:boolean)=>{};const control:any={toggleEl,setValue(value:boolean){on=!!value;toggleEl.classList.toggle('is-enabled',on);return control;},getValue:()=>on,setDisabled(value:boolean){off=!!value;toggleEl.classList.toggle('is-disabled',off);return control;},onChange(fn:(value:boolean)=>void){changed=fn;return control;}};toggleEl.addEventListener('click',()=>{if(off)return;control.setValue(!on);changed(on);});build(control);return this;}
    addButton(build:(control:any)=>void){const buttonEl=this.controlEl.ownerDocument.createElement('button');this.controlEl.append(buttonEl);const control:any={buttonEl,setButtonText(text:string){buttonEl.textContent=text;return control;},setCta(){buttonEl.classList.add('mod-cta');return control;},setWarning(){buttonEl.classList.add('mod-warning');return control;},setTooltip(text:string){buttonEl.setAttribute('aria-label',text);return control;},setDisabled(off:boolean){buttonEl.disabled=!!off;return control;},onClick(fn:()=>void){buttonEl.addEventListener('click',()=>fn());return control;}};build(control);return this;}
}
export const MarkdownRenderer={render:async()=>{}};
export function setIcon(_element:HTMLElement,_icon:string){}
export function normalizePath(path:string){return path.replace(/\\/g,'/').replace(/\/+/g,'/').replace(/^\/|\/$/g,'');}
export function displayTooltip(_element:HTMLElement,_content:string,_options?:object){}
export function parseLinktext(text:string){const at=text.indexOf('#');return {path:at<0?text:text.slice(0,at),subpath:at<0?'':text.slice(at)};}
export async function requestUrl(options:any){return (globalThis as any).__annotatorTestRequest(options);}
export class Plugin {
    manifest:{id:string;dir?:string}={id:'obsidian-annotator'}; data:any={}; writes:any[]=[]; cleanups:(()=>void)[]=[]; commands:any[]=[];
    constructor(public app:any){}
    async loadData(){return this.data;}
    async saveData(value:any){
        this.writes.push(structuredClone(value));
        // Match the host's JSON writer: adapter errors may resolve silently.
        try { await this.app.vault.adapter.write(`${this.manifest.dir || `${this.app.vault.configDir}/plugins/${this.manifest.id}`}/data.json`,JSON.stringify(value,null,2)); this.data=structuredClone(value); } catch { /* host writeJson catches adapter failures */ }
    }
    register(fn:()=>void){this.cleanups.push(fn);} registerView(..._args:any[]){} registerExtensions(..._args:any[]){} registerEditorExtension(..._args:any[]){} settingTabs:any[]=[]; addSettingTab(tab:any){this.settingTabs.push(tab);} registerMarkdownPostProcessor(..._args:any[]){} registerEvent(..._args:any[]){}
    protocolHandlers=new Map<string,(params:any)=>unknown>();
    registerObsidianProtocolHandler(action:string,handler:(params:any)=>unknown){if(this.protocolHandlers.has(action))throw new Error(`Action "${action}" is already registered as a handler.`);this.protocolHandlers.set(action,handler);}
    addCommand(command:any){this.commands.push(command);} registerInterval(id:number){this.register(()=>window.clearInterval(id));}
    registerDomEvent(element:EventTarget,type:string,fn:EventListener,...options:any[]){element.addEventListener(type,fn,...options);this.register(()=>element.removeEventListener(type,fn,...options));}
}

export async function loadPdfJs(){return (globalThis as any).__annotatorTestPdfJs?.() || Promise.reject(new Error("No test PDF engine configured"));}
