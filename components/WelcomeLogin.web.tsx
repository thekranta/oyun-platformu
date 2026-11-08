import React, { useRef } from 'react';
import { Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { asset } from '@/lib/assetMap';
import { changeLanguage } from '@/lib/i18n';

type Props = {
  isLoggingIn: boolean; initialEmail: string;
  onLogin: (email: string, password: string) => void;
  onForgot: (email: string) => void; onSignup: () => void;
  onAdmin: () => void; onVeli: () => void; onOgretmen: () => void; onKurum: () => void;
};

export default function WelcomeLogin(p: Props) {
  const { t, i18n } = useTranslation();
  const en = i18n.language.startsWith('en');
  const email = useRef<HTMLInputElement>(null);
  const password = useRef<HTMLInputElement>(null);
  return <main className="mz-welcome">
    <style>{css}</style>
    <header className="mz-header">
      <div className="mz-brand"><span className="mz-brand-mark"><Image source={asset('/branding/mascot/el-sallar.webp')} accessibilityLabel="MiniZeka logosu" style={{ width: '100%', height: '100%' }} resizeMode="contain"/></span><span>MiniZeka<small>{en ? 'LITTLE DISCOVERIES, BIG SMILES' : 'KÜÇÜK KEŞİFLER, KOCAMAN GÜLÜMSEMELER'}</small></span></div>
      <nav aria-label={en ? 'Language' : 'Dil seçimi'}>{(['tr','en'] as const).map(lang => <button key={lang} type="button" aria-pressed={i18n.language.startsWith(lang)} onClick={() => changeLanguage(lang)}>{lang.toUpperCase()}</button>)}</nav>
    </header>
    <div className="mz-layout">
      <section className="mz-world" aria-labelledby="mz-headline">
        <div className="mz-intro"><span className="mz-eyebrow">{en ? 'A LITTLE WONDER EVERY DAY' : 'HER GÜN YENİ BİR “VAAY!”'}</span><h1 id="mz-headline">{en ? 'A little play.' : 'Biraz oyun.'}<br/><em>{en ? 'A world of discovery.' : 'Kocaman bir dünya.'}</em></h1><p>{en ? 'Colours, stories and melodies… Your next discovery is waiting!' : 'Renkler, hikâyeler, melodiler… Yeni keşfin seni bekliyor!'}</p></div>
        <div className="mz-illustration" aria-hidden="true">
          <svg viewBox="0 0 620 380" className="mz-landscape">
            <defs><linearGradient id="welcome-sky" x2="0" y2="1"><stop stopColor="#d6eee8"/><stop offset="1" stopColor="#f4efd8"/></linearGradient></defs>
            <path d="M62 350V190a248 184 0 0 1 496 0v160Z" fill="url(#welcome-sky)"/>
            <g className="mz-cloud"><path d="M104 111q-12-27 17-30 10-38 43-19 32-11 40 18 29 5 18 31Z" fill="#fffdf5"/></g>
            <g className="mz-sun"><circle cx="468" cy="96" r="40" fill="#f6c761"/><path d="M453 101q15 15 29 0" stroke="#ad7539" strokeWidth="3" fill="none" strokeLinecap="round"/><circle cx="455" cy="90" r="3" fill="#ad7539"/><circle cx="480" cy="90" r="3" fill="#ad7539"/></g>
            <path d="M75 254Q198 178 315 267Q436 199 551 243V350H75Z" fill="#b5d7b4"/>
            <path d="M58 298q136-62 260 1t248-7v57H58Z" fill="#86bbae"/>
            <ellipse cx="309" cy="350" rx="282" ry="23" fill="#d9e5cc"/>
            <path d="M304 351q-42-45 14-81" stroke="#f9e5b6" strokeWidth="38" fill="none"/>
            <g transform="translate(79 236) rotate(-12)"><rect width="83" height="87" rx="17" fill="#ec9a7d"/><path d="M20 47h43M42 25v44" stroke="#ffeac4" strokeWidth="11" strokeLinecap="round"/></g>
            <g transform="translate(452 252) rotate(10)"><rect width="91" height="77" rx="16" fill="#f2c86a"/><path d="M26 52l20-34 20 34Z" fill="#fff8e4"/></g>
            <g className="mz-flower"><path d="M190 340v-55m0 40q-32 0-27-23 24 2 27 23" stroke="#4d947b" strokeWidth="6" fill="#75b49a"/>{[0,72,144,216,288].map(a => <ellipse key={a} cx="190" cy="274" rx="11" ry="18" transform={`rotate(${a} 190 287)`} fill="#eaa5b7"/>)}<circle cx="190" cy="287" r="11" fill="#ffe4a0"/></g>
            <path d="M402 310q0-53 39-53" stroke="#5a9c80" strokeWidth="6" fill="none"/><path d="M411 284q-32-22-37 6 20 18 37-6m7-12q36-15 33 12-27 13-33-12" fill="#8abb87"/>
            <g className="mz-spark"><path d="M55 183l7 17 18 7-18 7-7 17-7-17-18-7 18-7Z" fill="#edb95c"/><path d="M559 168l5 13 14 6-14 5-5 14-5-14-14-5 14-6Z" fill="#d5add7"/></g>
          </svg>
          <div className="mz-mascot"><Image source={asset('/branding/mascot/el-sallar.webp')} style={{width:'100%',height:'100%'}} resizeMode="contain"/></div>
          <span className="mz-hello">{en ? 'Hello, explorer!' : 'Merhaba, küçük kaşif!'}</span>
        </div>
        <div className="mz-tags"><span>✦ {en ? 'Play' : 'Oyna'}</span><span>♫ {en ? 'Discover' : 'Keşfet'}</span><span>♡ {en ? 'Grow' : 'Büyü'}</span></div>
      </section>
      <section className="mz-door" aria-labelledby="mz-login-title">
        <span className="mz-door-star" aria-hidden="true">✦</span>
        <span className="mz-eyebrow">{en ? 'WELCOME TO MINIZEKA' : 'MİNİZEKA’YA HOŞ GELDİN'}</span>
        <h2 id="mz-login-title">{en ? 'Ready to explore?' : 'Keşfe hazır mısın?'}</h2>
        <p className="mz-form-note">{en ? 'Sign in with a grown-up. Then let the play begin!' : 'Bir büyüğünle giriş yap, oyunlar başlasın!'}</p>
        <form onSubmit={e => {e.preventDefault(); if (!p.isLoggingIn) p.onLogin(email.current?.value.trim() || '', password.current?.value || '');}}>
          <label htmlFor="mz-email">{en ? 'Email address' : 'E-posta adresi'}</label>
          <input id="mz-email" ref={email} type="email" autoComplete="username" defaultValue={p.initialEmail} placeholder={en ? 'Your email address' : 'E-posta adresiniz'} required/>
          <div className="mz-password-label"><label htmlFor="mz-password">{en ? 'Password' : 'Şifre'}</label><button className="mz-text-button" type="button" onClick={() => p.onForgot(email.current?.value.trim() || '')}>{t('login.forgotPassword')}</button></div>
          <input id="mz-password" ref={password} type="password" autoComplete="current-password" placeholder={en ? 'Your password' : 'Şifreniz'} required/>
          <button className="mz-primary" type="submit" disabled={p.isLoggingIn}>{p.isLoggingIn ? t('login.loggingIn') : en ? 'Sign in & start playing' : 'Giriş yap, oyuna katıl'} <span aria-hidden="true">→</span></button>
        </form>
        <div className="mz-signup"><span>{en ? 'New to MiniZeka?' : 'MiniZeka’ya yeni mi geldiniz?'}</span><button type="button" onClick={p.onSignup}>{en ? 'Create an account' : 'Hesap oluştur'} <span aria-hidden="true">↗</span></button></div>
        <div className="mz-adults"><span>{en ? 'GROWN-UP ENTRANCES' : 'YETİŞKİN GİRİŞLERİ'}</span><div>{[[en ? 'Parent panel' : 'Veli paneli',p.onVeli],[en ? 'Teacher login' : 'Öğretmen girişi',p.onOgretmen],[en ? 'Institution login' : 'Kurum girişi',p.onKurum],[en ? 'Specialist login' : 'Uzman girişi',p.onAdmin]].map(([label, action]) => <button key={label as string} type="button" onClick={action as () => void}>{label as string}<span aria-hidden="true">↗</span></button>)}</div></div>
      </section>
    </div>
    <footer>{en ? 'Every child is a whole world of possibilities.' : 'Her çocuk, keşfedilmeyi bekleyen kocaman bir dünya.'}<span aria-hidden="true"> ✦</span></footer>
  </main>;
}

const css = `
.mz-welcome{min-height:100%;width:100%;flex:1;background:#fcf7ed;color:#344f4b;font-family:system-ui,-apple-system,sans-serif;overflow:auto}.mz-welcome *{box-sizing:border-box}.mz-header{max-width:1200px;margin:auto;padding:26px 42px;display:flex;justify-content:space-between;align-items:center}.mz-brand{display:flex;align-items:center;gap:12px;font-size:27px;font-weight:850;letter-spacing:-1px}.mz-brand small{display:block;font-size:8px;letter-spacing:1.6px;margin-top:5px;color:#798a80;font-weight:750}.mz-brand-mark{display:grid;place-items:center;background:#e7b4bf;border-radius:17px;color:#fff9e9;width:49px;height:49px;font-size:38px;transform:rotate(-8deg)}.mz-header nav{display:flex;gap:4px;background:#eeeadd;padding:4px;border-radius:30px}.mz-header nav button{border:0;background:transparent;border-radius:22px;color:#64796e;min-width:42px;min-height:38px;cursor:pointer;font-weight:700}.mz-header nav button[aria-pressed=true]{background:#fffdf8;color:#344f4b;box-shadow:0 2px 5px #344f4b12}.mz-layout{max-width:1150px;margin:14px auto 0;display:grid;grid-template-columns:1.35fr 1fr;align-items:center;gap:48px;padding:0 36px 24px}.mz-intro{padding:0 18px}.mz-eyebrow{font-size:10px;letter-spacing:2px;font-weight:800;color:#8d8c6b}.mz-intro h1{font-size:clamp(34px,4.2vw,55px);font-weight:850;letter-spacing:-2.5px;line-height:1.14;margin:16px 0}.mz-intro em{color:#d77c60;font-style:normal}.mz-intro p{font-size:15px;color:#758178;line-height:1.7;max-width:360px;margin:0}.mz-illustration{position:relative;margin-top:4px;aspect-ratio:620/380}.mz-landscape{width:100%;height:100%}.mz-mascot{position:absolute;left:32%;top:33%;width:34%;height:54%;animation:mz-float 4s ease-in-out infinite}.mz-hello{position:absolute;left:37%;top:20%;background:#fffcf5;padding:10px 16px;border-radius:20px 20px 20px 2px;box-shadow:0 3px 0 #dbc9ac50;font-size:12px;font-weight:700;transform:rotate(-5deg)}.mz-tags{display:flex;justify-content:center;gap:28px;font-size:13px;font-weight:750;color:#668c7b;margin-top:8px}.mz-tags span:nth-child(2){color:#b89049}.mz-tags span:nth-child(3){color:#b98097}.mz-door{position:relative;background:#fffdf8;border:1px solid #eee4d5;border-radius:100px 100px 30px 30px;padding:45px 34px 24px;box-shadow:0 18px 60px #9479520d,0 5px 0 #eee4d5;max-width:430px;width:100%}.mz-door-star{display:block;text-align:center;color:#e4b45b;font-size:34px;line-height:1;margin-bottom:18px}.mz-door>.mz-eyebrow{display:block;text-align:center;font-size:9px}.mz-door h2{text-align:center;font-size:27px;letter-spacing:-1px;margin:12px 0 8px}.mz-form-note{text-align:center;font-size:13px;line-height:1.6;color:#7d8478;margin:0 0 25px}.mz-door label{display:block;font-size:12px;font-weight:750;margin:0 0 8px;color:#56675d}.mz-door input{width:100%;min-height:51px;border:1.5px solid #e5e4d8;border-radius:14px;background:#faf9f1;padding:12px 15px;font:14px system-ui;color:#344f4b;outline:none}.mz-door input:focus{border-color:#5a9789;box-shadow:0 0 0 3px #5a97891a}.mz-password-label{display:flex;justify-content:space-between;align-items:center;margin-top:17px}.mz-text-button{border:0;background:none;color:#8b8875;cursor:pointer;font:11px system-ui;padding:8px 0;margin-top:-8px}.mz-primary{width:100%;min-height:55px;margin-top:22px;border:0;border-radius:16px;color:#fffaf0;background:#387f71;box-shadow:0 4px 0 #286457;font:750 15px system-ui;cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:14px 20px;transition:transform .2s,background .2s}.mz-primary:hover{background:#306e62;transform:translateY(-2px)}.mz-primary:disabled{opacity:.6;cursor:wait}.mz-signup{display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;margin:24px 0;color:#8a8878}.mz-signup button{border:0;background:none;font:750 12px system-ui;color:#bf7058;cursor:pointer;padding:8px 0}.mz-adults{border-top:1px dashed #e4dfcf;padding-top:17px;text-align:center}.mz-adults>span{font-size:8px;color:#989586;letter-spacing:2px;font-weight:800}.mz-adults>div{display:flex;justify-content:center;flex-wrap:wrap;gap:4px;margin-top:8px}.mz-adults button{min-height:40px;border:0;background:transparent;border-radius:10px;color:#6d7c70;font:600 11px system-ui;cursor:pointer;padding:8px 10px}.mz-adults button:hover{background:#f0f2e8}.mz-welcome button:focus-visible{outline:3px solid #d18f65;outline-offset:3px}.mz-welcome footer{text-align:center;font-size:11px;color:#999b87;padding:12px 16px 24px}.mz-welcome footer span{color:#d9ae60}.mz-cloud{animation:mz-drift 7s ease-in-out infinite alternate}.mz-sun{transform-origin:468px 96px;animation:mz-sun 5s ease-in-out infinite}.mz-flower{transform-origin:190px 340px;animation:mz-sway 4s ease-in-out infinite alternate}.mz-spark{animation:mz-sun 4s ease-in-out infinite}@keyframes mz-float{50%{transform:translateY(-8px) rotate(2deg)}}@keyframes mz-drift{to{transform:translateX(13px)}}@keyframes mz-sun{50%{opacity:.65}}@keyframes mz-sway{to{transform:rotate(5deg)}}
@media(min-width:1400px){.mz-layout{margin-top:4vh}}@media(max-width:800px){.mz-header{padding:20px 22px}.mz-layout{grid-template-columns:1fr;gap:22px;margin-top:6px;padding:0 22px 20px}.mz-intro{text-align:center;padding:0}.mz-intro h1{font-size:35px;letter-spacing:-1.5px;margin:12px 0}.mz-intro p{margin:auto;max-width:290px;font-size:13px}.mz-intro>.mz-eyebrow{font-size:9px}.mz-world{max-width:440px;width:100%;margin:auto}.mz-illustration{max-width:330px;margin:0 auto}.mz-tags{margin-top:0;gap:24px;font-size:12px}.mz-door{margin:auto;border-radius:42px 42px 26px 26px;padding:24px}.mz-door-star{display:none}.mz-door h2{font-size:24px}.mz-brand{font-size:23px}.mz-brand small{font-size:6px;letter-spacing:1px}.mz-brand-mark{width:40px;height:40px;font-size:30px}.mz-hello{font-size:9px;padding:7px 10px}.mz-form-note{margin-bottom:18px}}@media(prefers-reduced-motion:reduce){.mz-welcome *{animation:none!important;transition:none!important}}
@media(min-width:801px) and (max-height:800px){.mz-header{padding-top:16px;padding-bottom:16px}.mz-layout{margin-top:0;padding-bottom:8px;gap:38px}.mz-intro h1{font-size:43px}.mz-illustration{max-width:450px;margin:auto}.mz-door{padding:27px 30px 17px;border-radius:75px 75px 28px 28px}.mz-door-star{font-size:25px;margin-bottom:10px}.mz-form-note{margin-bottom:16px}.mz-signup{margin:15px 0}.mz-primary{margin-top:17px}.mz-welcome footer{padding-bottom:14px}}
@media(max-width:800px){.mz-illustration{max-width:240px}.mz-intro h1{font-size:30px}.mz-intro>.mz-eyebrow{display:none}.mz-header{padding-top:16px;padding-bottom:12px}.mz-layout{gap:18px}.mz-hello{font-size:7px;padding:5px 8px}.mz-door{padding:22px}.mz-signup{margin:17px 0}}
.mz-signup{flex-direction:column;align-items:stretch;gap:10px;margin:22px 0;color:#6c7568;font-size:13px;text-align:center}.mz-signup button{display:flex;align-items:center;justify-content:space-between;min-height:54px;width:100%;padding:14px 20px;border:1.5px solid #d99071;border-radius:16px;background:#fae6d6;color:#88492f;font-size:17px;font-weight:800;box-shadow:0 3px 0 #e7c7ac}.mz-signup button:hover{background:#f5d8c2}.mz-adults>span{font-size:12px;letter-spacing:1.3px;color:#677567}.mz-adults>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.mz-adults button{display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:54px;padding:12px;border:1px solid #d8e3d7;background:#eef3e9;color:#415e50;border-radius:13px;font-size:14px;font-weight:750;text-align:left}.mz-adults button:nth-child(2){background:#fff0d8;border-color:#eddbbb;color:#80602b}.mz-adults button:nth-child(3){background:#e7f2ef;border-color:#cde2db;color:#3c6b60}.mz-adults button:nth-child(4){background:#f2eaf3;border-color:#e3d5e6;color:#785580}.mz-adults button:hover{filter:brightness(.97)}
/* Fit ordinary desktop windows without shrinking the action targets. */
@media(min-width:801px){
  .mz-header{padding:12px 32px}.mz-layout{margin:0 auto;gap:32px;padding:0 28px 8px;grid-template-columns:1.25fr 1fr}
  .mz-door{padding:20px 26px 18px;border-radius:54px 54px 26px 26px}.mz-door-star{display:none}
  .mz-door h2{margin:8px 0 5px;font-size:25px}.mz-form-note{margin:0 0 14px}
  .mz-door input{min-height:46px;padding:10px 14px}.mz-password-label{margin-top:12px}
  .mz-primary{min-height:50px;margin-top:14px}.mz-signup{margin:15px 0;gap:8px}.mz-signup button{min-height:50px;padding:12px 18px}
  .mz-adults{padding-top:12px}.mz-adults>div{margin-top:10px;gap:8px}.mz-adults button{min-height:48px;padding:10px 12px}
  .mz-illustration{max-width:430px;margin:auto}.mz-intro h1{font-size:clamp(34px,3.6vw,48px)}.mz-welcome footer{padding:6px 16px 12px}
}
/* Narrow side panels and phones: the form stays prominent, the scenery becomes a compact welcome. */
@media(max-width:800px){
  .mz-header{padding:10px 18px}.mz-brand small{display:none}.mz-brand-mark{width:34px;height:34px;font-size:27px}
  .mz-layout{gap:10px;padding:0 16px 10px;margin:0 auto}.mz-world{max-width:430px;position:relative;min-height:82px;padding:8px 82px 4px 0}
  .mz-intro{text-align:left}.mz-intro h1{font-size:23px;letter-spacing:-.8px;margin:3px 0;line-height:1.18}.mz-intro p,.mz-tags{display:none}
  .mz-illustration{position:absolute;right:0;top:0;width:90px;height:82px;margin:0}.mz-landscape,.mz-hello{display:none}.mz-mascot{left:0;top:0;width:100%;height:100%}
  .mz-door{padding:18px 22px;border-radius:32px 32px 24px 24px}.mz-door>.mz-eyebrow{font-size:8px}.mz-door h2{font-size:23px;margin:7px 0 5px}
  .mz-form-note{font-size:12px;margin-bottom:12px}.mz-door input{min-height:46px;padding:10px 13px}.mz-password-label{margin-top:11px}
  .mz-primary{min-height:49px;margin-top:13px}.mz-signup{margin:14px 0;gap:7px}.mz-signup button{min-height:49px;padding:12px 18px}
  .mz-adults{padding-top:11px}.mz-adults>div{margin-top:9px;gap:8px}.mz-adults button{min-height:48px;padding:10px;font-size:13px}
  .mz-welcome footer{font-size:10px;padding:3px 16px 10px}
}
@media(max-height:700px){.mz-header{padding-top:7px;padding-bottom:7px}.mz-door{padding-top:13px;padding-bottom:13px}.mz-door>.mz-eyebrow{display:none}.mz-door h2{margin-top:0}.mz-form-note{margin-bottom:9px}.mz-signup{margin-top:11px;margin-bottom:11px}.mz-welcome footer{display:none}}
@media(max-width:800px) and (max-height:700px){.mz-world{min-height:60px;padding-top:0}.mz-intro h1{font-size:20px}.mz-illustration{height:60px}.mz-layout{gap:6px}.mz-door{padding-left:20px;padding-right:20px}}
@media(max-width:800px) and (max-height:700px){.mz-form-note{display:none}.mz-world{min-height:46px}.mz-illustration{height:46px}.mz-intro h1{font-size:18px}.mz-door h2{margin-bottom:12px}.mz-adults>div{margin-top:7px}.mz-signup{gap:5px}}
@media(max-width:800px) and (max-height:700px){.mz-header{padding-top:5px;padding-bottom:5px}.mz-layout{padding-bottom:4px}}
.mz-brand-mark{background:#FBE1CC;transform:none;border:1px solid #F0C8A8;padding:3px;border-radius:12px;overflow:hidden}
`;
