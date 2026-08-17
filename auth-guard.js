(() => {
  "use strict";

  const FIREBASE_SDK_VERSION = "12.17.1";
  const CENTRAL_APP_NAME = "central-access";
  const DEVICE_KEY = "central-device-id-v1";

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA8zLyzYwRv3qDIw-8H4_Tesy8iiH1haaA",
    authDomain: "central-de-apps.firebaseapp.com",
    projectId: "central-de-apps",
    storageBucket: "central-de-apps.firebasestorage.app",
    messagingSenderId: "222066712643",
    appId: "1:222066712643:web:130c3d5ebc5c4b935d74f6",
    measurementId: "G-44P6G2ZSE3"
  };

  const APP_CHECK_SITE_KEY = "";

  document.documentElement.classList.add("central-direct-guard");

  const style = document.createElement("style");
  style.textContent = `
    html.central-direct-guard body{visibility:hidden!important}
    #centralDirectGuard{
      position:fixed;inset:0;z-index:2147483647;display:flex;
      align-items:center;justify-content:center;padding:18px;
      background:linear-gradient(145deg,#667eea,#764ba2);
      font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif
    }
    #centralDirectGuard .box{
      width:min(420px,100%);background:#fff;border-radius:24px;
      padding:24px 20px;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.25)
    }
    #centralDirectGuard h2{font-size:21px;color:#20283a;margin:8px 0}
    #centralDirectGuard p{font-size:12px;line-height:1.55;color:#687187}
    #centralDirectGuard button{
      width:100%;min-height:48px;margin-top:12px;border:0;border-radius:14px;
      background:#667eea;color:#fff;font-weight:800
    }
  `;
  document.head.appendChild(style);

  function deviceId(){
    let id="";
    try{id=localStorage.getItem(DEVICE_KEY)||""}catch{}
    if(!id){
      id=(crypto.randomUUID?.()||("dev-"+Date.now()+"-"+Math.random().toString(36).slice(2)))
        .replace(/[^a-zA-Z0-9_-]/g,"");
      try{localStorage.setItem(DEVICE_KEY,id)}catch{}
    }
    return id
  }

  function allow(){
    document.documentElement.classList.remove("central-direct-guard");
    if(document.body)document.body.style.visibility="";
  }

  function deny(title,text){
    document.documentElement.classList.remove("central-direct-guard");
    document.body.style.visibility="visible";
    document.body.innerHTML = `
      <div id="centralDirectGuard">
        <div class="box">
          <div style="font-size:38px">🔐</div>
          <h2>${title}</h2>
          <p>${text}</p>
          <button id="centralDirectBack">Abrir Central</button>
        </div>
      </div>`;

    document.getElementById("centralDirectBack").onclick=()=>{
      location.href="https://kaua212106.github.io/Central-de-apps/";
    };
  }

  async function start(){
    try{
      const v=FIREBASE_SDK_VERSION;

      const [appM,authM,fsM]=await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${v}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${v}/firebase-firestore.js`)
      ]);

      let app;
      try{
        app=appM.getApp(CENTRAL_APP_NAME);
      }catch{
        app=appM.initializeApp(FIREBASE_CONFIG,CENTRAL_APP_NAME);
      }

      if(APP_CHECK_SITE_KEY){
        try{
          const ac=await import(`https://www.gstatic.com/firebasejs/${v}/firebase-app-check.js`);
          ac.initializeAppCheck(app,{
            provider:new ac.ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY),
            isTokenAutoRefreshEnabled:true
          });
        }catch(err){
          console.warn("App Check guard:",err)
        }
      }

      const auth=authM.getAuth(app);
      const db=fsM.getFirestore(app);

      await authM.setPersistence(auth,authM.browserLocalPersistence);

      authM.onAuthStateChanged(auth,async user=>{
        try{
          if(!user){
            deny(
              "Acesso pela Central",
              "Entre na Central com sua conta autorizada antes de abrir este aplicativo."
            );
            return
          }

          await user.getIdToken(true);

          const userSnap=await fsM.getDoc(
            fsM.doc(db,"usuarios",user.uid)
          );

          if(
            !userSnap.exists() ||
            userSnap.data().ativo!==true ||
            userSnap.data().bloqueado===true
          ){
            deny(
              "Acesso não autorizado",
              "Sua conta não possui autorização ativa para usar os aplicativos."
            );
            return
          }

          const token=await user.getIdTokenResult(true);

          if(token.claims?.admin===true){
            allow();
            return
          }

          const devSnap=await fsM.getDoc(
            fsM.doc(db,"usuarios",user.uid,"dispositivos",deviceId())
          );

          if(
            !devSnap.exists() ||
            devSnap.data().ativo!==true ||
            devSnap.data().bloqueado===true
          ){
            deny(
              "Dispositivo não autorizado",
              "Este aparelho precisa ser aprovado na Central antes de abrir o aplicativo."
            );
            return
          }

          allow();
        }catch(err){
          console.error("Verificação de acesso:",err);
          deny(
            "Não foi possível verificar o acesso",
            "Abra a Central novamente e tente acessar o aplicativo por ela."
          );
        }
      });

    }catch(err){
      console.error("Central Direct Guard:",err);
      deny(
        "Não foi possível verificar o acesso",
        "A verificação de segurança falhou. Abra novamente pela Central."
      );
    }
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",start,{once:true});
  }else{
    start();
  }
})();
