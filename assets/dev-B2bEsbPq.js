import{a as e,c as t,f as n,g as r,n as i,o as a,s as o,w as s}from"./format-SEfipOmb.js";var c=`duck-hunt-idle.devPassword`,l=document.getElementById(`dev`),u=`seen`,d=[],f=e=>e.replace(/[&<>"']/g,e=>`&#${e.charCodeAt(0)};`),p=e=>s[e-1]?.name??`Lodge ${e}`;function m(e){let t=(Date.now()-new Date(e).getTime())/1e3;return t<90?`just now`:t<3600?`${Math.round(t/60)} min ago`:t<172800?`${Math.round(t/3600)} h ago`:`${Math.round(t/86400)} days ago`}var h=e=>new Date(e).toLocaleDateString(void 0,{month:`short`,day:`numeric`});function g(){try{return localStorage.getItem(c)??``}catch{return``}}function _(e=``){l.innerHTML=`
    <h1>Players</h1>
    <form class="card login">
      <label for="pw">Admin password</label>
      <input id="pw" type="password" autocomplete="current-password" />
      <button class="btn" type="submit">Show players</button>
      ${e?`<p class="bad">${f(e)}</p>`:``}
    </form>`,l.querySelector(`form`).addEventListener(`submit`,e=>{e.preventDefault(),v(l.querySelector(`#pw`).value)})}async function v(e){if(!r())l.innerHTML=`<h1>Players</h1><p class="card">The leaderboard isn't connected yet (no Supabase address in src/config.ts).</p>`;else{l.innerHTML=`<h1>Players</h1><p class="note">Loading…</p>`;try{d=await a(e);try{localStorage.setItem(c,e)}catch{}y()}catch(e){_(n(e))}}}function y(){let r=Date.now(),a=e=>d.filter(t=>r-new Date(t.last_seen).getTime()<e*36e5).length,s=[...d].sort((e,t)=>u===`week`?(t.week_birds??0)-(e.week_birds??0):u===`birds`?t.birds-e.birds:u===`joined`?t.created_at.localeCompare(e.created_at):t.last_seen.localeCompare(e.last_seen));l.innerHTML=`
    <h1>Players</h1>
    <section class="stats">
      <div class="card"><strong>${d.length}</strong><span>players</span></div>
      <div class="card"><strong>${a(24)}</strong><span>played today</span></div>
      <div class="card"><strong>${a(168)}</strong><span>this week</span></div>
    </section>
    <div class="bar">
      <div class="seg">
        ${[`seen`,`week`,`birds`,`joined`].map(e=>`<button data-sort="${e}" class="${e===u?`on`:``}">${e===`seen`?`Last played`:e===`week`?`This week`:e===`birds`?`Most birds`:`Newest`}</button>`).join(``)}
      </div>
      <button class="btn small" id="refresh">Refresh</button>
    </div>
    <ul class="list">
      ${s.map(e=>`
        <li class="card player ${e.hidden?`is-hidden`:``}">
          <div class="top"><strong>${f(e.name)}${e.hidden?` <em class="tag">Hidden</em>`:``}</strong><span>${m(e.last_seen)}</span></div>
          <div class="line">${f(p(e.lodge))} · ${i(e.birds,`letters`)} birds · ${e.species} kinds${e.stars?` · ${e.stars} ★`:``}</div>
          <div class="line dim">Day ${e.day} · ${e.play_hours.toFixed(1)} h played · ${i(e.coins,`letters`)} coins${e.seasons?` · ${e.seasons} seasons`:``}</div>
          <div class="line dim">This week: ${i(e.week_birds??0,`letters`)} birds · Joined ${h(e.created_at)}${e.flyway?` · ${f(e.flyway)} flyway`:``}${e.build?` · v ${f(e.build)}`:``}</div>
          <div class="line dim">${e.saved_at?`Cloud save: ${m(e.saved_at)}`:`No cloud save yet`}</div>
          <div class="tools">
            ${e.saved_at?`<button class="btn small soft" data-save="${e.id}">Copy save code</button>`:``}
            <button class="btn small soft" data-hide="${e.id}" data-to="${e.hidden?`0`:`1`}">${e.hidden?`Show on board`:`Hide from board`}</button>
            <button class="btn small soft danger" data-remove="${e.id}" data-name="${f(e.name)}">Remove</button>
          </div>
        </li>`).join(``)||`<li class="note">No players yet.</li>`}
    </ul>
    <p class="note"><button class="link" id="logout">Forget password on this device</button></p>`,l.querySelectorAll(`[data-sort]`).forEach(e=>e.addEventListener(`click`,()=>{u=e.dataset.sort,y()})),l.querySelector(`#refresh`).addEventListener(`click`,()=>void v(g())),l.querySelectorAll(`[data-hide]`).forEach(e=>e.addEventListener(`click`,async()=>{e.disabled=!0;try{await t(g(),e.dataset.hide,e.dataset.to===`1`),await v(g())}catch(t){alert(n(t)),e.disabled=!1}})),l.querySelectorAll(`[data-save]`).forEach(t=>t.addEventListener(`click`,async()=>{t.disabled=!0;try{let n=await e(g(),t.dataset.save);if(!n)throw Error(`none`);try{await navigator.clipboard.writeText(n),t.textContent=`Copied`}catch{prompt(`Copy this save code:`,n)}}catch(e){alert(e instanceof Error&&e.message===`none`?`No cloud save for this player yet.`:n(e))}t.disabled=!1})),l.querySelectorAll(`[data-remove]`).forEach(e=>e.addEventListener(`click`,async()=>{if(confirm(`Remove ${e.dataset.name} from the leaderboard for good? Their name becomes free. If they play again, they'll join again.`)){e.disabled=!0;try{await o(g(),e.dataset.remove),await v(g())}catch(t){alert(n(t)),e.disabled=!1}}})),l.querySelector(`#logout`).addEventListener(`click`,()=>{try{localStorage.removeItem(c)}catch{}_()})}var b=g();b?v(b):_();