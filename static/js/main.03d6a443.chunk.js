(this["webpackJsonpcascade-client"]=this["webpackJsonpcascade-client"]||[]).push([[0],{44:function(e,t,n){e.exports=n(87)},49:function(e,t,n){},74:function(e,t){},76:function(e,t){},86:function(e,t,n){},87:function(e,t,n){"use strict";n.r(t);var a=n(0),r=n.n(a),c=n(38),o=n.n(c),i=(n(49),n(89)),u=n(41),s=n(2),d=n(6),l=n(3),m=1,f=4,v=n(5),p=n(39),b=n.n(p);function O(e){U().server.send(JSON.stringify(e))}function g(e,t){var n=new WebSocket(e);n.addEventListener("open",(function(){return console.log("opening socket")})),n.addEventListener("close",(function(){return console.log("closing socket")})),n.addEventListener("error",(function(){return console.log("socket error")})),n.addEventListener("message",(function(e){var n=e.data,a=JSON.parse(n);switch(console.log("ACTION (from server):",a),a.type){case"MODE_SET":I(a.mode,t);break;case"ORDER_SET":!function(e,t){var n=e.order,a=U(),r=a.myId,c=a.order,o=a.peers;t(e),0===c.length&&n.forEach((function(e){e===r||o[e]||E(!0,e,t)}))}(a,t);break;case"PEER_SIGNAL":!function(e,t){var n=U().peers,a=e.fromId,r=e.signal;(n[a]||E(!1,a,t)).signal(r)}(a,t);break;case"ping":case"pong":!function(e){var t=e.fromId,n=e.startTime,a=e.type,r=U(),c=r.mode,o=r.myId;if(!t)return;switch(a){case"ping":O({type:"pong",forId:t,fromId:o,startTime:n});break;case"pong":!function(e,t){var n=C[e]||[];0===n.length&&(C[e]=n);n.push(Date.now()-t)}(t,n),2===c&&O({type:"ping",forId:t,fromId:o,startTime:Date.now()})}}(a);break;default:t(a)}})),setInterval((function(){O({type:"ping"})}),3e4),t({type:"SERVER_SET",server:n})}function E(e,t,n){var a=U(),r=a.myId,c=a.myStream,o=new b.a({initiator:e,stream:c});return o.on("signal",(function(e){O({type:"PEER_SIGNAL",forId:t,fromId:r,signal:e})})),o.on("stream",(function(e){var a=U().mode;2===a?(A=Date.now(),function(e,t){var n=U(),a=n.myId,r=n.order,c=e.getAudioTracks(),o=e.getVideoTracks(),i=r.indexOf(a);r.slice(0,i).forEach((function(e,n){var a=[c[n],o[n]].filter(Boolean);2!==a.length&&console.error("Missing a track in the cascade"),t({type:"STREAMS_ADD",id:e,stream:new MediaStream(a)})}))}(e,n),I(3,n)):(n({type:"STREAMS_ADD",id:t,stream:e}),3===a&&I(f,n),a===f&&0===o.streams.length&&o.addStream(h()))})),o.on("data",(function(e){var t,n=U().mode,a=JSON.parse(e.toString()),r=a.startTime,c=a.type;"ping"===c&&(t=r,D.push(Date.now()-t),o.send(JSON.stringify({type:"pong",startTime:r}))),"pong"===c&&(!function(e){T.push(Date.now()-e)}(r),2===n&&y(o))})),n({type:"PEERS_ADD",id:t,peer:o}),o}function j(e){var t=U(),n=t.myId,a=t.order,r=t.peers,c=a.indexOf(n)+1;return r[a[c]]}function y(e){e.send(JSON.stringify({type:"ping",startTime:Date.now()}))}function S(e){return e.getTracks().map((function(e){return e.clone()}))}function h(){var e=S(U().myStream);return new MediaStream(e)}function I(e,t){t({type:"MODE_SET",mode:e});var n=U().recorder;switch(e){case 2:k=Date.now(),function(){var e=U().peers;Object.values(e).forEach((function(e){e.removeStream(e.streams[0])}))}(),function(){var e=U(),t=e.iAmInitiator,n=e.myId,a=j();a&&y(a);t&&O({type:"ping",fromId:n,startTime:Date.now()})}();break;case 3:R=Date.now(),function(){var e=U(),t=e.myId,n=e.myStream,a=e.order,r=e.streams,c=j();if(c){var o=a.indexOf(t),i=S(n),u=a.slice(0,o).reduce((function(e,t){return[].concat(Object(v.a)(e),Object(v.a)(r[t].getTracks()))}),[]),s=[].concat(Object(v.a)(u),Object(v.a)(i)),d=new MediaStream(s);c.addStream(d),_=Date.now()}}(),n.start();break;case f:n.stop(),function(){var e=U(),t=e.myId,n=e.order,a=e.peers,r=h(),c=j();c&&(c.removeStream(c.streams[0]),c.addStream(r));var o=n.indexOf(t);n.slice(0,o).forEach((function(e){a[e].addStream(r)}))}()}}function w(e,t){var n=new MediaRecorder(e,{mimeType:"video/webm"});return n.addEventListener("dataavailable",(function(e){var n=e.data;t({type:"FILES_ADD",file:URL.createObjectURL(n)})})),n.addEventListener("start",(function(){var e=U().iAmInitiator?R:A;x=Date.now()-e})),n.addEventListener("stop",(function(){!function(){var e=U(),t=e.iAmInitiator,n={type:"latency_info",fromId:e.myId,beforeRecordLatency:x};if(j()){var a=T.length,r=M(T),c=L(T,r),o=_-R;n=Object(l.a)({},n,{peerPongNum:a,peerPongTimeAvg:r,peerPongTimeStdDev:c,sendLatency:o})}if(t)Object.entries(C).forEach((function(e){var t=Object(s.a)(e,2),n=t[0],a=t[1].length,r=M(T);O({type:"latency_info",fromId:n,serverPongNum:a,serverPongTimeAvg:r,serverPongTimeStdDev:L(T,r)})}));else{var i=D.length,u=M(D),d=L(D,u),m=A-k-6e3;n=Object(l.a)({},n,{peerPingNum:i,peerPingTimeAvg:u,peerPingTimeStdDev:d,signalingLatency:m})}O(n),T=[],D=[],C={}}()})),n}var T=[];var D=[];var k,A,R,_,x,C={};function M(e){return e.reduce((function(e,t){return e+t}),0)/e.length}function L(e,t){var n=e.reduce((function(e,n){return e+Math.pow(n-t,2)}),0);return Math.sqrt(n/(e.length-1))}var N={audioOutput:null,files:[],iAmInitiator:!1,mode:0,myId:null,myStream:null,order:[],peers:{},recorder:null,server:null,streams:{}};var P={};function U(){return P}function J(e,t){var n=function(e,t){console.log("ACTION",t);var n=e.files,a=e.mode,r=e.myId,c=e.myStream,o=e.peers,i=e.streams;switch(t.type){case"AUDIO_OUTPUT_SET":return Object(l.a)({},e,{audioOutput:t.deviceId});case"FILES_ADD":return Object(l.a)({},e,{files:n.concat(t.file)});case"MODE_SET":var u=t.mode,f=2===u?{}:i;return Object(l.a)({},e,{mode:u,streams:f});case"MY_ID_SET":return Object(l.a)({},e,{myId:t.id});case"MY_STREAM_SET":var v=c?a:m;return Object(l.a)({},e,{mode:v,myStream:t.stream,recorder:w(t.stream,t.dispatch)});case"ORDER_SET":var p=t.order,b=0===p.findIndex((function(e){return r===e})),O=p.reduce((function(e,t){return t===r?e:[Object(l.a)({},e[0],Object(d.a)({},t,o[t])),Object(l.a)({},e[1],Object(d.a)({},t,i[t]))]}),[{},{}]),g=Object(s.a)(O,2),E=g[0],j=g[1];return Object(l.a)({},e,{iAmInitiator:b,order:p,peers:E,streams:j});case"PEERS_ADD":return Object(l.a)({},e,{peers:Object(l.a)({},o,Object(d.a)({},t.id,t.peer))});case"SERVER_SET":return Object(l.a)({},e,{server:t.server});case"STREAMS_ADD":return Object(l.a)({},e,{streams:Object(l.a)({},i,Object(d.a)({},t.id,t.stream))});default:return console.error("Unknown action:",t),e}}(e,t);return P=n,n}var F=Object(a.createContext)(N),V=function(e){var t=e.children,n=Object(a.useReducer)(J,N),c=Object(s.a)(n,2),o=c[0],i=c[1];return r.a.createElement(F.Provider,{value:[o,i]},t)},B=n(90),G=n(91),W=n(18),Y=n.n(W),q=n(24),$=new(window.AudioContext||window.webkitAudioContext),z=function(){var e=Object(a.useContext)(F),t=Object(s.a)(e,2),n=t[0],c=t[1],o=n.audioOutput,i=n.myStream,u=n.peers,m=Object(a.useState)([]),f=Object(s.a)(m,2),p=f[0],b=f[1],O=Object(a.useState)(!1),g=Object(s.a)(O,2),E=g[0],j=g[1],y=Object(a.useState)(null),S=Object(s.a)(y,2),h=S[0],I=S[1],w=Object(a.useState)(null),T=Object(s.a)(w,2),D=T[0],k=T[1],A=function(){var e=Object(q.a)(Y.a.mark((function e(){var t;return Y.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,navigator.mediaDevices.getUserMedia({audio:{deviceId:h&&{exact:h},autoGainControl:{exact:!1},echoCancellation:!1,noiseSuppression:{exact:!1}},video:{deviceId:D&&{exact:D}}});case 2:t=e.sent,i&&(i.getTracks().forEach((function(e){return e.stop()})),Object.values(u).forEach((function(e){e.removeStream(i),e.addStream(t)}))),$.createMediaStreamSource(t).connect($.destination),c({type:"MY_STREAM_SET",dispatch:c,stream:t});case 7:case"end":return e.stop()}}),e)})));return function(){return e.apply(this,arguments)}}();Object(a.useEffect)((function(){i&&E&&function(){var e=Object(q.a)(Y.a.mark((function e(){var t;return Y.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,navigator.mediaDevices.enumerateDevices();case 2:t=e.sent,b(t);case 4:case"end":return e.stop()}}),e)})));return function(){return e.apply(this,arguments)}}()()}),[i,E]),Object(a.useEffect)((function(){A()}),[h,D]);var R=["audioinput","audiooutput","videoinput"],_=["Audio Input","Audio Output","Video Input"],x=[[h,I],[o,function(e){c({type:"AUDIO_OUTPUT_SET",deviceId:e})}],[D,k]],C=p.reduce((function(e,t){var n=t.deviceId,a=t.kind,r=R.indexOf(a);return[].concat(Object(v.a)(e.slice(0,r)),[Object(l.a)({},e[r],Object(d.a)({},n,t))],Object(v.a)(e.slice(r+1)))}),[{},{},{}]);return r.a.createElement("section",{className:"av-setup"},E?r.a.createElement(r.a.Fragment,null,C.map((function(e,t){var n=Object.values(e);if(0===n.length)return null;var a=_[t],c=Object(s.a)(x[t],2),o=c[0],i=c[1];return r.a.createElement("label",{key:a},a,r.a.createElement("select",{onChange:function(e){return i(e.target.value)},value:o||"default"},n.map((function(e){var t=e.deviceId,n=e.label;return r.a.createElement("option",{key:t,value:t},n)}))))})),r.a.createElement("button",{onClick:function(){return j(!1)}},"x")):r.a.createElement("button",{onClick:function(){return j(!0)}},"Audio/Video settings"))},H=function(){var e=Object(a.useContext)(F),t=Object(s.a)(e,2)[1],n=Object(a.useState)(3),c=Object(s.a)(n,2),o=c[0],i=c[1];return Object(a.useEffect)((function(){o>0?setTimeout((function(){i(o-1)}),2e3):I(3,t)}),[o]),r.a.createElement("span",{className:"countdown"},o)};function K(e){var t=Object(a.useRef)();return Object(a.useEffect)((function(){t.current=e}),[e]),t.current}var Q=function(e){var t=e.id,n=e.numColumns,c=e.stream,o=Object(a.useContext)(F),i=Object(s.a)(o,2),u=i[0],d=i[1],l=u.audioOutput,p=u.iAmInitiator,b=u.mode,g=u.myId,E=u.order,j=t===g,y=K(c),S=K(l),h=Object(a.useCallback)((function(e){e&&(c!==y&&("srcObject"in e?e.srcObject=c:e.src=URL.createObjectURL(c)),l&&l!==S&&e.setSinkId(l))}),[l,c]),I=Object(a.useRef)(null),w=Object(B.a)({item:{id:t,type:"participant"},canDrag:function(){return p&&[m,f].includes(b)},collect:function(e){return{isDragging:e.isDragging()}}}),T=Object(s.a)(w,2),D=T[0].isDragging,k=T[1],A=Object(G.a)({accept:"participant",drop:function(e){O({type:"ORDER_SET",fromId:g,order:E})},hover:function(e){var n=e.id;if(n!==t){var a=E.indexOf(t),r=E.indexOf(n),c=Object(v.a)(E);c[a]=n,c[r]=t,d({type:"ORDER_SET",order:c})}}}),R=Object(s.a)(A,2)[1];k(I),R(I);var _=2===b?1:E.indexOf(t)+1,x=Math.ceil(_/n),C={gridColumn:"".concat(_-(x-1)*n," / span 1"),gridRow:"".concat(x," / span 1"),opacity:D?.5:1},M={backgroundColor:2===b?"yellow":3===b?"red":"green"};return r.a.createElement("div",{ref:I,className:"video-draggable",style:C},c&&r.a.createElement("video",{autoPlay:!0,muted:j,ref:h}),j&&r.a.createElement(z,null),_>0&&r.a.createElement("span",{className:"order-number",style:M},_),2===b&&j&&p&&r.a.createElement(H,null))},X=function(e){var t=e.onClick;return r.a.createElement(r.a.Fragment,null,r.a.createElement("div",null,"Welcome. Let's make the connections."),r.a.createElement("div",null,"First, enable your audio and video. Before you click the button, put on headphones so there's no feedback!"),r.a.createElement("button",{onClick:t},"Let's go!"))},Z=function(){var e=Object(a.useContext)(F),t=Object(s.a)(e,2),n=t[0],c=t[1];console.log("STATE",n);var o=n.files,i=n.iAmInitiator,u=n.mode,d=n.myId,l=n.myStream,v=n.streams,p=Object(a.useState)(!0),b=Object(s.a)(p,2),g=b[0],E=b[1];if(g)return r.a.createElement(X,{onClick:function(){return E(!1)}});var j=Object.values(v).length+1,y=Math.ceil(Math.sqrt(j)),S=Math.ceil(j/y),h=100/y,w=100/S,T={gridTemplateColumns:"repeat(".concat(y,", ").concat(h,"%)"),gridTemplateRows:"repeat(".concat(y,", ").concat(w,"%)")};return r.a.createElement(r.a.Fragment,null,r.a.createElement("main",{className:"video-grid",style:T},r.a.createElement(Q,{id:d,numColumns:y,stream:l}),Object.entries(v).map((function(e){var t=Object(s.a)(e,2),n=t[0],a=t[1];return r.a.createElement(Q,{key:n,id:n,numColumns:y,stream:a})}))),r.a.createElement("nav",null,[m,f].includes(u)&&i&&j>1&&r.a.createElement("button",{className:"big-button",onClick:function(){return function(e){var t={type:"MODE_SET",fromId:U().myId,mode:2};I(2,e),O(t)}(c)}},"GO"),3===u&&i&&r.a.createElement("button",{className:"big-button",onClick:function(){return function(e){I(f,e)}(c)}},"STOP")),r.a.createElement("aside",null,o.map((function(e,t){return r.a.createElement("a",{key:e,download:"cascade".concat(t+1,".webm"),href:e},"Download cascade ",t+1," video")}))))},ee=function(e){var t=e.children,n=Object(a.useContext)(F),r=Object(s.a)(n,2),c=r[0],o=r[1],i=c.myStream,u=K(i),d=new URLSearchParams(window.location.search).get("server");return Object(a.useEffect)((function(){i&&!u&&d&&g(d,o)}),[i,u,d]),d?t:"You have to have a server. Sorry, that's just the way it is."},te=(n(86),function(){return r.a.createElement(V,null,r.a.createElement(ee,null,r.a.createElement(i.a,{backend:u.a},r.a.createElement(Z,null))))});Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));o.a.render(r.a.createElement(te,null),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then((function(e){e.unregister()})).catch((function(e){console.error(e.message)}))}},[[44,1,2]]]);
//# sourceMappingURL=main.03d6a443.chunk.js.map