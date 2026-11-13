/*
Copyright (c) 2013, FuturePress

All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met: 

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer. 
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution. 

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

The views and conclusions contained in the software and documentation are those
of the authors and should not be interpreted as representing official policies, 
either expressed or implied, of the FreeBSD Project.
*/
// Exact function/class bodies extracted from the SHA256-pinned 0.2.11 release.
function m0(e,t){var r;if(!e)throw new Error("No Element Provided");return void 0!==e.querySelector?e.querySelector(t):(r=e.getElementsByTagName(t)).length?r[0]:void 0}
function L0(e,t){var r,n,i=t.url,a=i.indexOf("://")>-1;e&&(n=m0(e,"head"),(r=m0(n,"base"))||(r=e.createElement("base"),n.insertBefore(r,n.firstChild)),!a&&window&&window.location&&(i=window.location.origin+i),r.setAttribute("href",i))}
function B0(e,t){var r,n,i=t.canonical;e&&(r=m0(e,"head"),(n=m0(r,"link[rel='canonical']"))?n.setAttribute("href",i):((n=e.createElement("link")).setAttribute("rel","canonical"),n.setAttribute("href",i),r.appendChild(n)))}
function M0(e,t){var r,n,i=t.idref;e&&(r=m0(e,"head"),(n=m0(r,"link[property='dc.identifier']"))?n.setAttribute("content",i):((n=e.createElement("meta")).setAttribute("name","dc.identifier"),n.setAttribute("content",i),r.appendChild(n)))}
class R0{constructor(e){this.context=e||this,this.hooks=[]}register(){for(var e=0;e<arguments.length;++e)if("function"==typeof arguments[e])this.hooks.push(arguments[e]);else for(var t=0;t<arguments[e].length;++t)this.hooks.push(arguments[e][t])}deregister(e){let t;for(let r=0;r<this.hooks.length;r++)if(t=this.hooks[r],t===e){this.hooks.splice(r,1);break}}trigger(){var e=arguments,t=this.context,r=[];return this.hooks.forEach((function(n){try{var i=n.apply(t,e)}catch(e){console.log(e)}i&&"function"==typeof i.then&&r.push(i)})),Promise.all(r)}list(){return this.hooks}clear(){return this.hooks=[]}}
export {L0 as replaceBase,B0 as replaceCanonical,M0 as replaceMeta,R0 as Hook};
