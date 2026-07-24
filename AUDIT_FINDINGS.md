# Oyun Denetim Bulgulari (2026-06-21)

Iki otomatik denetim (adversarial dogrulamali). Kod hatalari + okul oncesi yas-uygunlugu.

## Bug Denetimi — 49 dogrulandi / 72 aday

### CRITICAL (1)

1. **[RenkliBaglantalar.tsx:241]** (state) PanResponder useRef ile donduruldu; ilk render kapanislarini yakaliyor, oyun oynanamaz
   - panResponder, useRef(PanResponder.create({...})).current ile olusturuluyor. useRef argumani yalnizca ILK render'da degerlendirilir, sonraki render'larda saklanan nesne dondurulur. Bu yuzden onPanResponderGrant/Move/Release handler'lari ilk render'daki `balls`, `selectedBalls`, `isDragging` degerlerine (hepsi baslangic: balls=[], selectedBalls=[], isDragging=false) kalici olarak baglidir. onPanResponderGrant icinde cagrilan findBallAtPosition (satir 116-126) ilk render'in `balls` degiskenini (bos dizi) tarar, dolayisiyla HER ZAMAN null doner ve hicbir top secilemez. Ayrica onPanResponderMove satir 260'ta `if (!isDragging) return;` daima erken doner (stale isDragging=false), onPanResponderRelease satir 294'te `selectedBalls.length` daima 0'dir (stale []). Sonuc: top secme, surukleme, baglama ve patlatma mekaniginin tamami calismaz.
   - _Repro:_ Oyuncu bir topa dokunup surukler -> onPanResponderGrant findBallAtPosition'i ilk render'in bos balls dizisi uzerinde calistirir -> null doner -> selectedBalls hep bos kalir -> onPanResponderRelease'te length 0 -> handlePop hicbir zaman cagrilmaz -> popCount hic artmaz -> oyun asla ilerlemez/bitmez. Oyun tamamen oynanamaz.

### HIGH (9)

1. **[GruplamaOyunu.tsx:73]** (state) Son soruda tekrar dokunma onGameEnd'i birden fazla kez cagiriyor
   - Son soru dogru cevaplandiginda oyun-bitis dali (satir 67-81) konfeti baslatip 2000ms'lik bir setTimeout ile onGameEnd'i planliyor, ancak butonlari kilitleyen/devre disi birakan hicbir state degisikligi yok ve suankiSoruIndex son indexte kaliyor (bu dalda setSuankiSoruIndex cagrilmaz). Bu nedenle mevcutSoru hala son soru olarak kalir ve ayni dogru butona tekrar dokunmak kosulu yeniden saglayip ikinci bir setTimeout planlar. Sonuc: onGameEnd (oyun sonucu/skor gonderimi) birden cok kez tetiklenir. Bu davranis render zamanlamasindan bagimsizdir; hem web hem native'de olusur.
   - _Repro:_ Son soruda dogru kategori butonuna dokun (konfeti baslar, 2sn geri sayim). 2 saniye dolmadan ayni dogru butona bir kez daha dokun -> onGameEnd iki kez cagrilir -> ayni oyun icin cift skor/bitis kaydi.

2. **[HafizaOyunu.tsx:285]** (scoring) onGameEnd stale closure: son asamanin suresi ve son hamle raporlanmiyor
   - handleStageComplete satir 265'te setCumulativeTime(prev => prev + stageDuration) ile o asamanin suresini state'e ekliyor, ancak 3 saniyelik setTimeout ile cagirilan handleNextStage (satir 280-290) `cumulativeTime`, `totalMoves` ve `totalErrors` degiskenlerini AYNI render'in closure'undan okuyor. Bu closure, son setCumulativeTime/setTotalMoves guncellemelerinden ONCEKI degerleri tasiyor. Sonucta oyun bitiminde onGameEnd'e gonderilen toplam sure son asamanin suresini HIC icermez ve totalMoves son (kazandiran) hamleyi saymaz (bir eksik).
   - _Repro:_ Oyunu son asamaya (index 4) kadar oyna ve son cifti eslestir. handleStageComplete stage5 suresini state'e ekler ama handleNextStage closure'daki eski cumulativeTime'i (yalnizca asama 1-4 toplami) okur -> onGameEnd('hafiza', cumulativeTime, ...) son asamanin ~saniyelerini ve son hamleyi kayip olarak raporlar. Ornek: her asama 20sn surerse gercek toplam 100sn iken raporlanan 80sn olur.

3. **[KodlamaOyunu.tsx:234]** (logic) Editor/custom bolum kazanildiginda kampanya ilerlemesi bozuluyor ve oyun erken bitiyor
   - levelIdx state'i custom (editor) bolumden bagimsizdir. Editore girip (mode=EDIT) saveCustom ile ozel harita oynanip kazanildiginda WON -> auto-advance efekti (satir 256-261) nextLevel'i cagirir. nextLevel ise levelIdx'e bakar: 'levelIdx >= LEVELS.length-1' ise onGameEnd cagrilir, degilse setLevel(LEVELS[levelIdx+1]) yapip oyuncuyu kampanya bolumune atlatir. Yani custom harita kazanmak gercek kampanya ilerlemesini degistirir/atlatir. saveCustom levelIdx'i guncellemez, bu yuzden desync olusur.
   - _Repro:_ Son kampanya bolumundeyken (levelIdx=2) ✏️ ile editore gir, start+goal koy, ▶️ ile oyna ve cozersen: nextLevel'de levelIdx(2)>=LEVELS.length-1(2) true olur ve onGameEnd('Kodlama Oyunu', ...) tetiklenir -> tum oyun 'tamamlandi' olarak bildirilir (zorlukSeviyesi=3), oysa 3. bolum gercekten oynanmadi. Erken bolumlerde ise custom kazanmak seni bir sonraki kampanya bolumune zorla atlatir.

4. **[MutfakDedektifi.tsx:323]** (logic) Seviye 1'de sonsuz dongu: oyun asla bitmez, skor asla kaydedilmez
   - handleLevelComplete icindeki dallanma mantigi seviye 1'i bir tuzaga cevirir. shouldLevelUp = (errors === 0 && levelTime < 20). Kosullar: (1) level>=5 -> endGame, (2) !shouldLevelUp && level>1 -> endGame, (3) shouldLevelUp -> bir ust seviye, (4) else -> ayni seviyeyi yeniden uret. Seviye 1'de shouldLevelUp false ise (herhangi bir hata VEYA 20 saniyeden uzun sure) hicbir bitis dali tetiklenmez cunku level>=5 degil ve level>1 degil; kod else dalina duser ve seviye 1'i sonsuza kadar yeniden uretir. 3-6 yas hedef kitlesinin buyuk cogunlugu seviyeyi 20 sn altinda bitiremez, dolayisiyla oyun cocuk icin hicbir zaman ilerlemez ve endGame/Supabase kaydi hicbir zaman calismaz.
   - _Repro:_ Seviye 1'i (3 oge) 20 saniyeden uzun surede VEYA en az 1 hata ile tamamla -> kutlama sonrasi seviye 1 tekrar uretilir, oyun ne ilerler ne biter, skor kaydedilmez. Ev butonu disinda cikis yok.

5. **[MuzikCalar.tsx:479]** (state) handleSongFinish auto-advance kullanır stale currentSongIndex -> yanlış/tekrarlanan sonraki şarkı
   - onPlaybackStatusUpdate callback'i Audio.Sound.createAsync'e (satır 459) şarkı yüklenirken bir kez kaydedilir ve o render'daki currentSongIndex değerini kalıcı olarak yakalar (expo-av callback'i re-render'da yenilenmez). Şarkı bitince handleSongFinish (satır 470) bu stale currentSongIndex'i kullanır (satır 479 nextIndex = (currentSongIndex+1)%len ve satır 483 currentSongIndex<len-1). Ayrıca otomatik geçişte çağrılan loadSound de aynı stale onPlaybackStatusUpdate referansını yeni sese bağladığı için stale index kalıcılaşır. Sonuç: otomatik ilerleme yanlış şarkıya gider veya aynı şarkıda takılır.
   - _Repro:_ Mount'ta loadSound(0) çalışır, callback currentSongIndex=0 yakalar. Şarkı 0 doğal olarak biter -> handleSongFinish (none modda) currentSongIndex=0<len-1 olduğundan loadSound(1) yükler, ANCAK yeni sesin callback'i de currentSongIndex=0 yakalar. Şarkı 1 bitince nextIndex hesabı yine 0+1=1 -> şarkı 1 sonsuza dek tekrar yüklenir, liste 1. şarkıdan sonra ilerlemez.

6. **[OnlukCerceve.tsx:241]** (crash) Same transform array mixes native-driven and JS-driven Animated nodes (native crash)
   - The draggable apple's transform array combines pan.x/pan.y (driven with useNativeDriver:false via Animated.event on line 158 and the reset spring on line 163) together with scaleAnim (driven with useNativeDriver:true via the springs on lines 156 and 161) on the SAME Animated.View. React Native forbids a single view/node graph being animated by both the native driver and the JS driver. When scaleAnim runs on the native driver it moves the view to native; the JS-driven pan then throws the invariant 'Attempting to run JS driven animation on animated node that has been moved to native, this is not supported.' On web (react-native-web) useNativeDriver is ignored so this only manifests on iOS/Android.
   - _Repro:_ Native build (iOS/Android): press and start dragging the apple -> onPanResponderGrant fires Animated.spring(scaleAnim, useNativeDriver:true) while onPanResponderMove updates pan (useNativeDriver:false) on the same transform -> RN throws the native/JS driver conflict, drag crashes.

7. **[QuantityComparison.tsx:200]** (scoring) finishGame son turu saymiyor (stale roundHistory closure)
   - handleChoice icinde 10. tur dogru cevaplandiginda once setRoundHistory(prev => [...prev, roundData]) cagriliyor (asenkron kuyruklaniyor), hemen ardindan setTimeout ile finishGame() cagriliyor. Ancak finishGame, handleChoice ile AYNI render closure'inda tanimli oldugu icin roundHistory'nin GUNCELLENMEMIS (son tur eklenmemis) halini okur. Bu yuzden correctAnswers en fazla 9 olur, round_history dizisi 10. turu icermez, cognitive_speed_score ve algilananKelime yanlis hesaplanir.
   - _Repro:_ Tum 10 turu dogru cevapla. Beklenen: 10/10 dogru, cognitive_speed_score = 100 - avgResponseTime/100. Gercek: onGameEnd'e correct_answers=9, algilananKelime='9/10 doğru' gonderilir, cognitive_speed_score ~90 tabanina duser ve round_history yalnizca 9 kayit icerir (10. tur Supabase'e hic yazilmaz).

8. **[SihirliTuval.tsx:242]** (state) Sure dolunca finishGame stale closure ile SIFIR istatistik raporluyor
   - Timer useEffect (satir 233-248) yalnizca [isGameComplete, gameReady] degistiginde calisir. setInterval callback'i, gameReady false->true oldugu render'daki `finishGame` fonksiyonunu kapatir (closure). O render'da correctAnswers=0, errors=0, moveHistory=[]. finishGame ise bu degiskenleri kendi closure'undan okur (satir 270-289: moveHistory.length, correctAnswers, errors). Cocuk oynayip da 5 dakikalik sure dolunca (timeLeft<=1 -> finishGame, satir 240) onGameEnd cagrisi correct_answers:0, errors argumani:0, round_history:[], cognitive_speed_score:0, visual_attention_score:0 ile gider. gameStart stabil oldugu icin sadece 'duration' dogru olur; geri kalan tum performans verisi sifirlanir ve ogretmen paneline yanlis (sifir) kayit dusher.
   - _Repro:_ Oyunu baslat, birkac bolgeyi dogru boya + birkac hata yap ama tumunu bitirme, 5 dk sureyi doldur -> onGameEnd correct_answers=0, errors=0, round_history=[] raporlar (gercekte >0 olmasi gerekirken).

9. **[UzayBloklari.tsx:139]** (scoring) Timer timeout raporlarken stale closure: hamle/hata/moveHistory sifir gonderiliyor
   - Timer effect'i sadece [isGameComplete, gameReady] bagimliliklariyla kuruluyor (satir 145). setInterval icindeki finishGame cagrisi (satir 139), effect ilk kez calistigi (gameReady false->true olurken) render'daki finishGame fonksiyonunu yakalar. O anda moveHistory=[], errors=0, gridRotation=0 olarak kapaniyor. Oyun boyunca moveHistory/errors degisse de effect bir daha calismadigi icin interval ayni eski finishGame referansini tutar. Sure dolunca (180sn) finishGame calisir ve onGameEnd'e totalMoves=0, correctMoves=0, errors=0, moveHistory=[] gonderir. Cocuk oyunu sureyle bitirirse tum gercek performans verisi sifir kaydedilir.
   - _Repro:_ Cocuk oyunu oynar, birkac blok yerlestirir ve/veya hatali dokunuslar yapar (errors>0, moveHistory dolu), ancak grid'i 180 saniye icinde tamamlamaz -> timer 0'a duser -> finishGame stale closure ile calisir -> onGameEnd('uzay-bloklari', duration, 0, 0, null, {response_time:0, error_count:0, visual_attention_score:0, moveHistory:[]}) yani tum hamle/hata/skor verileri sifir. Not: grid'i tamamlayarak biten oyunda (handleGameComplete yolu) veri dogru, sadece timeout yolunda bozuk.

### MEDIUM (21)

1. **[AdaletHikayesi.tsx:268]** (memory-leak) Temizlenmeyen setTimeout'lar unmount sonrasi setState ve cift onExit'e yol aciyor
   - onAudioFinish icindeki final dalinda `setTimeout(()=>{setShowConfetti(true); setTimeout(onExit,4000)},2000)` (satir 266-269) ve playAudio icindeki `setTimeout(()=>onAudioFinish(type),1000)` (satir 235, 252) timer'lari hicbir ref'te tutulmuyor ve temizlenmiyor. Tek cleanup effect'i (satir 192-196) yalnizca stopAudio cagirir, bu timer'lari clearTimeout ETMEZ. Sonuc: unmount sonrasi setShowConfetti/onAudioFinish calisir (setState-after-unmount uyarisi) ve daha kotusu, onExit ikinci kez tetiklenebilir.
   - _Repro:_ Final node'una ulas, narrasyon biter, `setTimeout(onExit,4000)` planlanir. 4 saniye dolmadan kullanici DynamicBackground cikis butonuna basar -> onExit bir kez tiklamayla cagrilir, bilesen unmount olur, sonra timer da atesler ve onExit ikinci kez cagrilir -> ebeveynde cift navigasyon/temizleme; ayrica bloke olmus narrasyonun 1000ms fallback timer'i unmount sonrasi setState tetikler.

2. **[AileSepetiMacerasi.tsx:259]** (logic) Missing Supabase env vars silently skips onGameEnd result reporting
   - logGameResult() reads EXPO_PUBLIC_SUPABASE_URL/KEY and does `if (!SUPABASE_URL || !SUPABASE_KEY) return;` (line 259) BEFORE the `if (onGameEnd)` block (line 280). But onGameEnd is a parent callback that has nothing to do with Supabase (the locally-built `logData` object is never even sent anywhere - it is dead code). So when those two env vars are absent, the early return prevents onGameEnd from ever firing, meaning the game result / score is never reported to the parent even though nothing about that reporting requires Supabase.
   - _Repro:_ Run the app in an environment where EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY is undefined -> play to the 'final' node -> logGameResult() returns at line 259 -> onGameEnd(...) at line 286 is never called -> the completed game is never recorded / scored by the parent.

3. **[AileSepetiMacerasi.tsx:220]** (web-incompat) Audio load/autoplay failure permanently freezes the story (no manual advance)
   - Scene progression depends entirely on the audio's didJustFinish callback (onAudioFinish) to move narrative -> choice, or to auto-advance linear/final scenes. If Audio.Sound.createAsync throws or the sound never actually plays, the catch block (lines 220-222) just logs and returns; onAudioFinish is never invoked, so setPhase('choice') / setCurrentNodeId(next) never happen. There is no manual advance button (the code comments explicitly note buttons were removed). On web, browser autoplay policy commonly blocks programmatic play() that runs after the `await stopAudio()` (the user-gesture context is lost across the await), so didJustFinish never fires.
   - _Repro:_ On web, enter a scene whose narration is autoplay-blocked or fails to load (network error / unsupported format) -> playAudio catches or the sound stays paused -> onAudioFinish never runs -> phase stays 'narrative' forever, choices never render, the game is stuck with no way to proceed.

4. **[AileSepetiMacerasi.tsx:210]** (race) Overlapping playAudio calls orphan a Sound and can navigate to the wrong node
   - playAudio does `await stopAudio()` then `await Audio.Sound.createAsync(...)` before assigning soundRef.current. If a second node change (or option select) triggers playAudio while the first is still inside these awaits, the second call's stopAudio sees soundRef.current still null (first hasn't assigned yet), so the first sound is never unloaded once both resolve - it leaks and keeps playing. Worse, its setOnPlaybackStatusUpdate callback closes over onAudioFinish/currentNode from the earlier render; when that orphaned sound finishes it calls setPhase('choice') or setCurrentNodeId(oldNode.next) for the stale node, corrupting navigation and playing two audios at once.
   - _Repro:_ Rapidly cause two node transitions so their playAudio await windows overlap (e.g. option tapped just as the previous narration is being set up) -> soundRef.current is assigned sound1 then overwritten by sound2 -> sound1 is never unloaded (memory/audio leak) and on its didJustFinish it fires onAudioFinish bound to the old node, jumping to the wrong scene / overlapping audio.

5. **[BunuSoyle.tsx:450]** (scoring) Final onGameEnd raporunda moves ve errors son asamayi saymaz (stale closure)
   - handleNextStage son asamada onGameEnd cagirirken `moves` ve `errors` degerlerini kendi render-kapanisindaki (closure) local const'lardan okur. Bu fonksiyon, analyzeSpeech icinde setMoves(m=>m+1)/setErrors(e=>e+1) cagrildiktan HEMEN sonra setTimeout ile zamanlanir ve 2sn sonra ayni render'in kapanisiyla calisir. setMoves/setErrors updater formu state'i dogru gunceller ama handleNextStage local `moves`/`errors` sabitlerini gorur; bu sabitler son asamanin artislarindan once commit edilmis degerlerdir. Sonuc: son asamanin +1 move (ve varsa +1 error) artisi rapora YANSIMAZ. resultsToUse dogru gelir (parametre olarak tasindigi icin) ama moves/errors bir eksik gonderilir; boylece bildirilen hamle/hata sayisi ile stageResults arasinda tutarsizlik olur.
   - _Repro:_ 5 asamayi oyna, son asamada yanlis/sessiz cevap ver. errors state 5 olur ama onGameEnd'e gecen errors=4, moves=4 (5 yerine) olarak gider. Yani son asamanin hamle ve hata sayimi kaybolur.

6. **[BunuSoyle.tsx:505]** (race) onPressOut, async startRecording bitmeden tetiklenince orphan kayit ve hayalet 'dinliyor' durumu
   - recordButton'da onPressIn=startRecording (uzun sureli async: stopSound, permission, setAudioModeAsync, createAsync) ve onPressOut=stopRecording(true) bagli. Hizli bir dokunusta onPressOut, startRecording daha recordingRef.current'i atamadan calisir. stopRecording recordingRef.current'i null bulur, audioUri null olur; shouldAnalyze=true oldugundan satir 246 dalina girer, 'Ses Dosyasi Hatasi' gosterip 2sn sonra handleNextStage ile asamayi ILERLETIR. Bu sirada startRecording calismaya devam eder ve recordingRef.current=newRecording atar, setIsRecording(true) yapar. Boylece bir sonraki asamaya gecilmis olmasina ragmen arkaplanda sahipsiz (orphan) bir kayit ve hayalet 'SISTEM DINLIYOR' UI durumu olusur. Ayrica atlanan asama icin stageResults'a hicbir kayit eklenmez, yani nihai accuracy paydasi 5'ten az olabilir.
   - _Repro:_ Mikrofon butonuna cok kisa (basip hemen birak) dokun. startRecording awaitleri bitmeden onPressOut calisir; asama 'Ses Dosyasi Hatasi' ile atlanir, ardindan startRecording tamamlanip yeni asamada isRecording=true ve canli bir orphan Audio.Recording birakir.

7. **[CevizMacera.tsx:242]** (state) Temizlenmeyen setTimeout(onExit, 4000) unmount sonrasi / cift onExit cagirir
   - Final sahnede ses bitince onPlaybackStatusUpdate icinde setShowConfetti(true) ve setTimeout(() => onExit(), 4000) calisir. Bu timer hicbir yerde saklanmaz ve clearTimeout ile temizlenmez. Mount effect cleanup'i (satir 172-176) yalnizca soundRef.current.unloadAsync() cagirir; sesin unload edilmesi zaten planlanmis bir JS setTimeout'u iptal etmez. Ayrica callback unmount kontrolu (isMounted guard) yapmadan setShowConfetti setState cagirir. Sonuc: bilesen 4 saniye dolmadan unmount olursa (kullanici DynamicBackground'daki cikis butonuna basarsa) hem unmount sonrasi setState uyarisi olusur hem de 4 sn sonra onExit ikinci kez cagrilir.
   - _Repro:_ Bir end_* final dugumune ulas, ses bitsin (onExit 4 sn'ye planlanir), 4 sn dolmadan ust bilesendeki cikis kontroluyle CevizMacera'yi kapat -> 4 sn sonra orphan timer onExit'i tekrar cagirir (cift navigasyon / unmount sonrasi calisma).

8. **[DiziyiTamamla.tsx:165]** (scoring) Final hamle (move) count is undercounted by 1 due to stale closure
   - handleOptionPress does setTotalMoves(totalMoves + 1) and then schedules setTimeout(() => handleNextStage(), 1500). The scheduled arrow captures the handleNextStage instance from the SAME render, whose closure still holds the pre-increment totalMoves. On the final stage, handleNextStage calls onGameEnd('diziyi-tamamla', totalTime, totalMoves, totalErrors, ...) with that stale totalMoves, so the winning (final correct) click is never included. finalHamle reported to the parent is always exactly 1 less than the real number of taps. Same class of stale-closure risk applies to totalErrors, but since the winning click is correct (no error added), errors happen to be reported correctly; moves are always off by one.
   - _Repro:_ Play a run where the user taps every stage correctly on the first try (5 taps, 0 errors). Expected finalHamle = 5. Actual: onGameEnd reports finalHamle = 4 because the 5th (final winning) setTotalMoves has not been reflected in the setTimeout's captured closure.

9. **[DiziyiTamamla.tsx:119]** (state) setTimeout for stage advance is never cleared -> setState/onGameEnd after unmount
   - The setTimeout(() => handleNextStage(), 1500) created after a correct answer is never stored in a ref nor cleared on unmount. If the component unmounts within that 1.5s window (e.g. user taps the Cikis/logout button which triggers onLogout, or the parent navigates away), the timer still fires and handleNextStage runs setShowConfetti/setCurrentStage/... (or onGameEnd) on an unmounted component. This produces a React 'state update on an unmounted component' leak and can invoke onGameEnd/navigation after the screen is gone. There is no cleanup returned from any effect for this timer.
   - _Repro:_ Tap a correct option, then within 1.5 seconds tap the Cikis (logout) button. onLogout unmounts the component but the pending setTimeout still fires handleNextStage, calling setState (and, on the last stage, onGameEnd) after unmount -> React warning + potential post-unmount navigation/callback.

10. **[EksikSayiBul.tsx:165]** (state) Temizlenmeyen setTimeout'lar unmount sonrasi calisiyor; oyun bitmemesine ragmen onGameEnd tetikleniyor
   - handleDrop icindeki setTimeout(goNextStage, 1000/1600) ve setTimeout(setFeedback('idle'), 800) cagrilari hicbir yerde temizlenmiyor (component'te useEffect cleanup veya timer ref yok). DynamicBackground her zaman bir cikis butonu (onExit) gosteriyor. Kullanici dogru cevabi birakip bekleme suresi (1000ms normal asama, 1600ms son asama konfeti, ya da 800ms yanlis-feedback) dolmadan cikis butonuna basarsa component unmount olur ama zamanlayici hala aktiftir. Timer ateslediğinde: (a) ara asamalarda setCurrentStage/setPlacedNumber/setFeedback unmount olmus component uzerinde cagrilir (setState-after-unmount uyarisi + bos is), (b) SON asamada setTimeout(goNextStage,1600) -> goNextStage else dalina girip onGameEnd('eksik-sayi-bul', ...) cagirir. Yani kullanici oyundan CIKMIS olmasina ragmen ebeveyn bilesene 'oyun tamamlandi' bildirimi gider; sonuc kaydedilir / yanlis navigasyon olur.
   - _Repro:_ Son asamada dogru sayiyi birak -> konfeti basladi (1600ms bekleme) -> hemen sol alttaki cikis butonuna bas -> component unmount olur ama 1600ms sonra onGameEnd yine de cagrilir, kullanici cikmis olmasina ragmen oyun 'bitirildi' olarak raporlanir. Ara asamalarda ise cikinca setCurrentStage vb. unmount sonrasi calisir.

11. **[HafizaOyunu.tsx:275]** (state) Temizlenmeyen setTimeout'lar: unmount sonrasi setState ve istenmeyen onGameEnd
   - handleStageComplete'teki 3sn'lik setTimeout (satir 275) ve handleCardPress'teki 1sn'lik eslesmeme setTimeout'u (satir 247) hicbir yerde clearTimeout ile temizlenmiyor; useEffect cleanup da yok. Kullanici bu bekleme pencerelerinde Cikis (onExit) butonuna basip bileseni unmount ederse, timer'lar yine de calisip unmount sonrasi setCards/setSelectedCards/setIsProcessing cagirir. Daha kotusu, son asamanin konfeti bekleme suresinde cikilirsa 3sn'lik timer handleNextStage -> onGameEnd'i tetikler; boylece kullanici oyunu terk etmis olmasina ragmen oyun 'tamamlandi' olarak parent'a raporlanir.
   - _Repro:_ Son asamada son cifti eslestir, konfeti ekranindayken 3sn dolmadan Cikis (onExit) butonuna bas. Bilesen unmount olur ama zamanlayici hala aktiftir; 3sn sonra handleNextStage calisir ve onGameEnd('hafiza', ...) cagirilir -> terk edilen oyun yanlislikla bitmis/kaydedilmis gibi raporlanir + unmount sonrasi setState uyarisi.

12. **[KodlamaOyunu.tsx:284]** (scoring) moves sayaci undo/clear ile azaltilmiyor ve tum denemeler boyunca birikiyor
   - moves yalnizca addCmd icinde artirilir (satir 276). undo (satir 284) komutu diziden cikarir ama setMoves'u azaltmaz; clear (satir 283) komutlari sifirlar ama moves'a dokunmaz. Ayrica basarisiz her denemede eklenen komutlar da moves'a kalici eklenir. Sonucta onGameEnd'e gecen 'hamle' degeri gercek cozum hamle sayisini degil, tum DPad basimlarinin (geri alinanlar ve silinen denemeler dahil) toplamini yansitir.
   - _Repro:_ Bir bolumde 5 komut ekle (moves=5), 3'unu ⌫ ile geri al (commands=2), sonra oyna ve kazan. Gercek kullanilan hamle 2 iken onGameEnd'e hamle=5 gider. Benzer sekilde bir bolumu birkac kez denersen (ekle-oyna-kaybet-clear-tekrar ekle) moves surekli artar.

13. **[KutuyuBul.tsx:168]** (state) Correct-answer setTimeout never cleared; fires after unmount/exit
   - On a correct answer a 1500ms setTimeout is scheduled to call setStage (non-final) or onGameEnd (final stage). The timer id is never stored and there is no cleanup useEffect, so it keeps running after the component unmounts.
   - _Repro:_ Kullanici son asamada dogru kutuya basar, 1.5 saniye dolmadan cikis (X) butonuna basar -> onExit bileseni kaldirir ama timer yine de onGameEnd('kutuyu-bul', ...) cagirir; parent, kullanici oyunu terk ettigi halde tamamlanmis bir oyun kaydeder. Final olmayan asamada ayni pencere setStage'i unmount olmus bilesende cagirir (setState-after-unmount uyarisi/sizinti).

14. **[MutfakDedektifi.tsx:431]** (state) SelectableItem bilesen govdesi icinde tanimlandigi icin her render'da unmount/remount oluyor
   - SelectableItem, MutfakDedektifi bileseninin govdesi icinde tanimlanmis ve JSX olarak <SelectableItem .../> seklinde kullaniliyor. Her ebeveyn render'inda yeni bir bilesen fonksiyon referansi olusur, bu yuzden React tum ogeleri farkli bir tip olarak gorup unmount edip remount eder. Sonuc: her ebeveyn state degisiminde (ornegin mavisMessage guncellemesi, oge secimi) tum yiyecek ogelerinin useRef'teki scaleAnim'i sifirlanir ve secim/bounce animasyon useEffect'i yeniden calisir; secili ogenin animasyonu her render'da bastan baslar ve gereksiz remount yuku olusur.
   - _Repro:_ Bir ogeye dokun (mavisMessage ve selectedItem degisir) -> ebeveyn render olur -> tum SelectableItem'lar remount olur, secili ogenin bounce animasyonu sifirlanip yeniden baslar; her state degisiminde tekrarlanir.

15. **[MuzikCalar.tsx:471]** (state) repeatMode değişikliği çalan şarkının callback'ine ulaşmaz (stale closure) -> tekrar modu çalışmaz
   - handleSongFinish içindeki repeatMode (satır 471 'one', satır 477 'all') createAsync sırasında yakalanan stale değerdir. setRepeatMode (satır 606/648) sesi yeniden yüklemediği için o an çalan sesin didJustFinish callback'i eski repeatMode değerini kullanmaya devam eder. Kullanıcının tekrar modu seçimi çalan şarkı için hiç uygulanmaz.
   - _Repro:_ Şarkıyı çal (yüklenirken repeatMode='none' yakalandı). Şarkı çalarken 'repeat-one' butonuna bas (state 'one' olur ama ses yeniden yüklenmez). Şarkı bitince handleSongFinish stale repeatMode='none' görür -> şarkı tekrar etmez, bunun yerine sonraki şarkıya geçer. Aynı şekilde 'all' seçilse de liste döngüsü tetiklenmez.

16. **[SayilariBirlestir.tsx:156]** (memory-leak) 1500ms setTimeout temizlenmiyor: unmount sonrasi setState / onGameEnd cagrilir
   - handleConnectionComplete icindeki setTimeout(..., 1500) (satir 156-167) hicbir ref'e saklanmiyor ve unmount'ta clearTimeout ile temizlenmiyor. Basari animasyonu penceresi sirasinda kullanici cikis yaparsa (onExit ile bilesen unmount olur) zamanlayici yine de ateslenir; ara asamalarda setStage/successAnim.setValue, son asamada ise onGameEnd cagrilir.
   - _Repro:_ Son asamanin son baglantisini tamamla (stageComplete=true) ve 1.5 saniye dolmadan sol ustteki cikis (X) butonuna bas. Bilesen unmount olsa bile 1500ms sonra timer calisir: unmount edilmis bilesende setState uyarisi ve/veya oyun zaten kapatilmisken onGameEnd('sayilari-birlestir', ...) tekrar tetiklenir (istenmeyen oyun-sonu kaydi).

17. **[ShadowDetective.tsx:224]** (state) finishGame son turun verisini eksik gonderiyor (stale closure)
   - completeRound() icinde once setRoundData(prev => [...prev, {tur, hata, sure}]) ile o turun verisi ekleniyor, sonra ayni fonksiyonun setTimeout'u finishGame()'i cagiriyor. Ancak hem completeRound hem finishGame ayni render'in closure'unda tanimli; finishGame'in okudugu `roundData` degiskeni, az once yapilan setRoundData guncellemesinden ONCEKI state'tir. Bu yuzden onGameEnd'e gonderilen ekstraVeri.tur_verisi son turu icermez. Son tur (Tur 10) icin bu ozellikle kritik: o turun {tur:10,...} kaydi finishGame closure'unda yoktur.
   - _Repro:_ 10 turu da tamamla -> son turda completeRound roundData'ya tur10 kaydini push eder ama finishGame closure'u tur1..9 (9 kayit) gorur -> onGameEnd('Golge Dedektifi', ..., {tur_verisi}) 10 yerine 9 tur kaydi ile cagrilir; Tur 10 verisi kaybolur.

18. **[ShadowDetective.tsx:212]** (memory-leak) completeRound icindeki setTimeout timer'lari temizlenmiyor -> unmount sonrasi setState/onGameEnd
   - completeRound() iki setTimeout kurar (motivasyon icin 2000ms ve ana gecis icin 1200/2500ms) ancak bunlar hicbir yerde clearTimeout ile temizlenmez ve bir cleanup effect'i yoktur. Kullanici bir tur bittikten sonraki bekleme penceresinde ana ekran (onExit) butonuna basip bileseni unmount ederse, timer yine calisir: setShowSuccess/setShowMotivation/successScale.setValue/setRound calisir (unmount sonrasi state guncellemesi) ve daha kritik olarak son turda finishGame() -> onGameEnd() unmount'tan/exit'ten SONRA tetiklenir. Bu, kullanici cikis yaptiktan sonra beklenmedik bir oyun-bitti cagrisi (cift tamamlama) uretir.
   - _Repro:_ Bir turu tamamla (success gorunur), 1200ms dolmadan header'daki home butonuna bas (onExit -> unmount) -> bekleyen timer setRound/finishGame'i calistirir; son turda onGameEnd cikistan sonra cagrilir + 'unmounted component update' uyarilari.

19. **[SihirliTuval.tsx:358]** (scoring) correctAnswers, tek dogru harekette yildiz bolgesi icin 2 sayarak sismesi
   - Dogru boyamada filledCount = ayni colorNumber'a sahip TUM bolge sayisi olarak hesaplanip (satir 358) correctAnswers += filledCount (satir 359) yapiliyor. colorNumber=3 icin iki bolge var (star1, star2). Tek bir dogru renk secimi/dokunusu correctAnswers'i 2 artirir, ancak moveHistory'ye yalnizca 1 hareket eklenir (satir 350). Boylece toplam 10 dogru dokunusta correctAnswers=11 olur. Bu deger 'Doğru' olarak ekranda gosterilir (satir 597) ve cognitive_speed_score ile visual_attention_score hesaplarina (satir 275-279) girdiginden metrikler gercek dogru-cevap sayisindan yuksek cikar.
   - _Repro:_ Tum bolgeleri dogru boya -> tamamlama ekraninda 'Doğru: 11' gorunur ama yalnizca 10 dogru dokunus/hareket yapilmistir (star1+star2 tek dokunusta boyandi). correct_answers metrigi gercek dogru cevap sayisini asar.

20. **[SiralamaOyunu.tsx:187]** (state) Round-gecis / oyun-bitis setTimeout'lari unmount'ta temizlenmiyor -> unmount sonrasi onGameEnd ve setState
   - Son dogru tiklamadan sonra kazanan yol setTimeout ile 1200ms (setCurrentRound + baslat) veya 1500ms (onGameEnd) gecikmeli calisir. Bu timer'lar hicbir yerde saklanip clearTimeout ile temizlenmiyor; useEffect cleanup'i yalnizca speechService.stopSpeech() cagiriyor. Kullanici bu gecikme penceresi icinde DynamicBackground'daki cikis (onExit) ile bileseni unmount ederse, timer yine de atesler: unmount olmus bilesende setCurrentRound/setKarisikSayilar/setPositions calisir (setState-after-unmount) ve daha kotusu onGameEnd('siralama', ...) tetiklenir -> kullanici oyundan ciktigi halde oyun tamamlanmis gibi kaydedilir/raporlanir.
   - _Repro:_ Son asamada 5'e tiklanip 'Tebrikler' oynarken (1500ms icinde) cikis butonuna bas -> bilesen unmount olur ama onGameEnd yine cagrilir; oyun bitmemesi gerekirken tamamlanmis olarak raporlanir + React unmounted-setState uyarisi.

21. **[TartiDengesi.tsx:62]** (crash) Ayni transform icinde native ve non-native driver karisimi (DraggableOption)
   - DraggableOption'da 'scale' animasyonu useNativeDriver:true ile (satir 42, 47) surulurken, ayni Animated.View'in transform dizisinde kullanilan pan.x/pan.y degerleri useNativeDriver:false ile (satir 44 onPanResponderMove ve satir 52 release spring) suruluyor. Satir 62'de translateX(pan.x), translateY(pan.y) ve scale ayni transform dizisinde birlikte kullaniliyor. React Native, ayni node/stil uzerinde native ve JS driven degerleri karistirmayi desteklemez.
   - _Repro:_ Native (iOS/Android) build'de bir opsiyona dokunup surukleme baslatildiginda onPanResponderGrant scale'i native driver ile calistirir; ardindan onPanResponderMove pan'i JS driver ile gunceller -> 'Attempting to run JS driven animation on animated node that has been moved to native' hatasi/uyarisi olusur, surukleme takilir veya crash olur. Web'de calisir, native'de bozulur.

### LOW (18)

1. **[AileSepetiMacerasi.tsx:238]** (memory-leak) Final-scene setTimeout chain not cleared; setState + onExit after unmount
   - In onAudioFinish for the final scene, setTimeout(() => { setShowConfetti(true); setTimeout(onExit, 4000); }, 2000) schedules timers that are never stored or cleared. If the component unmounts during this 2-6s window (e.g. user presses back via DynamicBackground onExit), the timers still fire, calling setShowConfetti on an unmounted component and invoking onExit a second time.
   - _Repro:_ Reach the final scene, let narration finish, then exit manually within ~6 seconds -> pending setTimeout still runs -> setShowConfetti fires after unmount (warning) and onExit is called again (double exit).

2. **[BunuSoyle.tsx:254]** (memory-leak) Temizlenmeyen setTimeout'lar unmount sonrasi setState/onGameEnd cagirir
   - analyzeSpeech ve stopRecording icindeki tum ilerleme gecisleri setTimeout(()=>handleNextStage(...), 2000) ile yapiliyor (satir 254, 281, 387, 393, 420). Bu timer id'leri saklanmiyor ve unmount'ta (useEffect cleanup) clearTimeout edilmiyor. Kullanici 2sn'lik pencere icinde onExit ile cikarsa ya da bilesen unmount olursa, timer yine atesler; handleNextStage setCurrentStage/setStageResults gibi setState'leri unmount sonrasi cagirir ve son asamada onGameEnd'i cikistan SONRA tetikleyerek istenmeyen navigasyon/geri cagirma uretebilir.
   - _Repro:_ Bir cevap ver (Harika/hata durumu), 2sn dolmadan geri (onExit) butonuna bas. Bilesen unmount olur ama zamanlanmis handleNextStage calisip setState (unmount sonrasi uyari) ve/veya son asamada onGameEnd'i tekrar cagirir.

3. **[CevizMacera.tsx:261]** (race) Final ses calarken Reset'e basmak yaris kosuluyla oyunu kapatabilir
   - Reset butonu yalnizca final dugumde ve showConfetti=false iken, yani final ses hala calarken gorunur (satir 366). handleReset calan sesi durdurmaz/unload etmez; sadece setCurrentNodeId('intro') yapar. currentNodeId effect'i asenkron playSceneAudio() cagirir ve orada soundRef.current.unloadAsync() await edilir. Bu unload tamamlanmadan once eski final sesi bitişini (didJustFinish) tetiklerse, eski onPlaybackStatusUpdate callback'i (stale currentNode=final ile) setShowConfetti(true) ve setTimeout(onExit, 4000) calistirir. Boylece kullanici resetlemis olmasina ragmen oyun kendini kapatir.
   - _Repro:_ Final sesin son anlarinda Reset'e bas: setCurrentNodeId('intro') sonrasi effect'in asenkron unloadAsync'i tamamlanmadan eski final ses didJustFinish uretir -> onExit 4 sn'ye planlanir -> kullanici sifirlamak istemesine ragmen oyundan cikartilir.

4. **[GruplamaOyunu.tsx:73]** (memory-leak) Oyun-bitis setTimeout'u unmount'ta temizlenmiyor
   - Satir 73'teki setTimeout bir ref/degiskende saklanmiyor ve useEffect cleanup'inda clearTimeout ile temizlenmiyor. Bu nedenle bilesen 2sn'lik pencere icinde unmount olursa (or. parent onExit ile ekrani kapatirsa) onGameEnd unmount sonrasi yine de tetiklenir ve zamanlayici sizar.
   - _Repro:_ Son soruyu dogru cevapla (2sn setTimeout planlanir). 2sn dolmadan bileseni unmount et (parent'in oyunu kapatmasi) -> onGameEnd unmount sonrasi cagrilir; timer temizlenmedigi icin planlanan geri cagirma yine calisir.

5. **[KodlamaOyunu.tsx:198]** (memory-leak) Bounce Animated.loop hicbir zaman durdurulmuyor (unmount temizligi yok)
   - useEffect([]) icinde Animated.loop(...).start() ile baslatilan sonsuz bounce animasyonunun cleanup fonksiyonu yok. Bilesen unmount edildiginde (or. ✕ ile cikis) loop durdurulmaz; Animated.Value guncellemeleri devam eder. Tekrarli mount/unmount'ta bu looplar birikir.
   - _Repro:_ Oyunu ac (loop baslar), sonra ✕ ile cik (onExit). Bounce loop'u durdurulmadigi icin arka planda calismaya devam eder; ayni ekrani birkac kez acip kapatinca birden fazla loop birikir.

6. **[KodlamaOyunu.tsx:229]** (state) Temizlenmeyen setTimeout'lar unmount sonrasi setState/speak tetikliyor
   - Voice efektindeki setTimeout(300) (satir 229) ile interval icindeki kazanma/kaybetme setTimeout(150) cagrilari (satir 345, 351) hicbir zaman clearTimeout ile temizlenmiyor. Efekt bagimliliklari sik degistigi icin (level/status/mode/commands.length) her degisimde onceki temizlenmeden yeni bir konusma zamanlanir; unmount aninda bekleyen timeout'lar setStatus/speak calistirir.
   - _Repro:_ Bir bolum secildikten hemen sonra (300ms icinde) ya da bir hamle sonucundan hemen sonra (150ms icinde) ✕ ile cik: unmount'tan sonra setStatus/speakTeacher calisir (unmounted component uyarisi / istenmeyen konusma). Ayrica bolumler arasi hizli gecislerde ust uste konusmalar tetiklenebilir.

7. **[OnlukCerceve.tsx:133]** (state) Success setTimeout is never cleared -> setState / onGameEnd fires after unmount
   - On completing a round, a 1500ms setTimeout is scheduled that calls setRound (round<10) or onGameEnd (round===10). The timeout id is not stored and there is no cleanup (no clearTimeout on unmount). If the user completes a round and taps the back button (onExit, line 184) within 1.5s, the parent unmounts this component but the pending timer still fires, calling setRound on an unmounted component (React state-update-after-unmount warning) and, on the final round, potentially invoking onGameEnd after the user already exited (a game result recorded despite exit).
   - _Repro:_ Complete any round (drag the last needed apple) then within 1.5s tap the back-arrow (onExit). Component unmounts but the un-cleared timer still runs setRound(r=>r+1) on the unmounted component. On round 10, exiting during the 1.5s window still triggers onGameEnd afterward, recording a finished game the user abandoned.

8. **[OnlukCerceve.tsx:103]** (logic) 'Prevent consecutive same target' fails between round 1 and round 2
   - The round-transition effect avoids repeating prevTarget, but the round 1 target (set via useState initializer on line 65) is never written into prevTarget, which stays 0. So when round becomes 2, the do/while only excludes 0 (an impossible target for the 1..5 range), meaning round 2 can generate the exact same number as round 1 even though the code comments explicitly intend to prevent consecutive identical targets.
   - _Repro:_ If round 1 target is e.g. 3, round 2's loop only rejects value===0, so it can pick 3 again -> two identical consecutive targets, violating the stated intent.

9. **[QuantityComparison.tsx:183]** (state) Cozulmeyen setTimeout: unmount sonrasi setState ve onGameEnd cagrisi
   - handleChoice icindeki setTimeout callback'leri (1100ms dogru, 700ms yanlis) hicbir yerde temizlenmiyor. Kullanici bu pencere icinde onExit ile cikip bilesen unmount olursa, timer yine calisir: setShowConfetti/setFeedback unmount sonrasi setState uyarisi verir; dahasi 10. tur dogru cevap sonrasi cikilirsa finishGame->onGameEnd, kullanici oyunu terk etmis olmasina ragmen bir oyun-sonu kaydi olusturur.
   - _Repro:_ 10. turda dogru cevapla, 1100ms dolmadan geri (onExit) tusuna bas. Bilesen kalksa bile setTimeout finishGame'i cagirir ve onGameEnd('miktar-avcisi', ...) tetiklenerek terk edilmis oyun icin sonuc kaydedilir.

10. **[QuantityComparison.tsx:60]** (memory-leak) Arka plan Animated.loop unmount'ta durdurulmuyor
   - float1 ve float2 icin baslatilan Animated.loop animasyonlari useEffect([]) icinde start ediliyor ancak cleanup fonksiyonu yok; unmount'ta loop'lar durdurulmuyor (a.stopAnimation / loop.stop cagrilmiyor). Bu, bilesen kaldirildiginda calismaya devam eden animasyon dongusu ve sizinti birakir.
   - _Repro:_ Bileseni mount edip sonra unmount et; float animasyon loop'lari arka planda calismaya devam eder cunku geri donen temizleme fonksiyonu tanimli degil.

11. **[RenkliBaglantalar.tsx:78]** (memory-leak) Animated.loop ve setTimeout'lar unmount'ta temizlenmiyor
   - startFloatingAnimation'daki Animated.loop suresiz calisir ve useEffect (satir 73-76) bir cleanup dondurmez; bilesen unmount edildiginde loop durdurulmaz. Benzer sekilde handlePop icindeki setTimeout (satir 164) ve finishGame setTimeout'u (satir 176) icin temizleme yoktur; bunlar unmount sonrasi setState cagirabilir. Davranis etkisi dusuk fakat gercek bir kaynak/uyari sizintisidir.
   - _Repro:_ Oyuncu bir patlatma animasyonu (400ms/2500ms setTimeout) beklerken 'home' ile cikis yapar (onExit) -> bilesen unmount olur -> bekleyen setTimeout tetiklenir ve setBalls/setPopCount/finishGame calisir -> React 'unmounted component uzerinde setState' uyarisi; floating loop arka planda calismaya devam eder.

12. **[SayiKomsulari.tsx:46]** (memory-leak) Yuzen animasyon looplari (float1/float2) unmount'ta durdurulmuyor
   - useEffect icinde Animated.loop ile baslatilan float1 ve float2 sonsuz animasyonlari hicbir cleanup fonksiyonu dondurulmedigi icin bilesen unmount edildiginde durdurulmaz (a.stopAnimation cagrilmiyor). Bu, oyun kapatilip tekrar acildikca birikmeyen ama unmount sonrasi calismaya devam eden animasyon dongusu birakir.
   - _Repro:_ Bileseni ac (loop baslar) -> onExit ile kapat -> useEffect cleanup olmadigi icin Animated.loop callback zinciri unmount sonrasi da devam eder; tekrarli ac/kapatlarda gereksiz animasyon kaynaklari birikir.

13. **[SihirliSiseler.tsx:207]** (memory-leak) Animasyonlar unmount'ta durdurulmuyor (selectedGlow loop sizintisi)
   - handleBottleTap icinde bir sise secilince baslatilan Animated.loop(selectedGlow) yalnizca secim iptal edilince, dokme yapilinca veya gecersiz hamlede stopAnimation ile durduruluyor. useEffect cleanup'i (satir 155-158) SADECE unloadSounds cagiriyor; hicbir animasyonu durdurmuyor. Bir sise secili haldeyken component unmount olursa (geri/kapat butonu) glow dongusu ile celebrateScale/pourAnim animasyonlari temizlenmeden calismaya devam eder. Web'de bu, unmount sonrasi calismaya devam eden bir RAF donsusudur.
   - _Repro:_ Bir siseye dokun (glow loop baslar) -> ust bardaki geri butonuna (onClose) bas -> component unmount olur ama selectedGlow loop'u durdurulmaz -> temizlenmeyen animasyon dongusu (bellek/CPU sizintisi).

14. **[SihirliSiseler.tsx:122]** (logic) Kolay seviyelerde niyet edilenden fazla bos sise olusuyor
   - filledBottles = bottleCount - empty olarak hesaplaniyor, ama toplam katman sayisi colors*MAX_LAYERS (colors*4). childAge<=42 icin bottleCount=4, empty=1 -> filledBottles=3, fakat colors=2 sadece 8 katman = 2 sise doldurur. i=2 icin allLayers.slice(8,12) BOS dizidir, yani 'dolu' olmasi gereken 3. sise bos kalir. Sonuc: config 'empty:1' derken pratikte 2 bos sise olusur (childAge<=54 icin de ayni: filledBottles=4 ama colors=3 sadece 3 sise doldurur). Zorluk config'i ile gercek durum uyusmuyor; oyun ilan edilenden kolay oluyor.
   - _Repro:_ childAge=40 ile oyunu ac -> gameState.bottles: index 0 ve 1 dolu (4'er katman), index 2 (id=2) bos, index 3 (id=3, 'empty' sise) bos -> beyan edilen 1 bos yerine 2 bos sise gorunur.

15. **[TartiDengesi.tsx:154]** (race) Temizlenmeyen setTimeout: unmount sonrasi onGameEnd/setState
   - handleDrop icindeki setTimeout cagrilari (satir 154-161 kazanma, 166 ve 171 hata) hicbir ref'te tutulmuyor ve cleanup yok. Kullanici geri butonuna (onExit, satir 204) veya son turda dogru cevaptan sonra timer beklerken cikarsa, timer yine de calisip onGameEnd cagirir ve unmount olmus bilesende setState (setShowConfetti/setRound) yapar.
   - _Repro:_ 10. turda dogru weight birakilir -> 1500ms timer baslar. 500ms icinde geri ok'a basilir (onExit) -> parent oyundan cikar. 1500ms dolunca timer onGameEnd('Tarti Dengesi',...) cagirir -> parent zaten cikmisken ikinci kez oyun-bitti olayi tetiklenir (cift navigasyon/yanlis kayit) ve unmount sonrasi setState uyarilari olusur.

16. **[TartiDengesi.tsx:94]** (memory-leak) Animated.loop (float1/float2) unmount'ta durdurulmuyor
   - float1 ve float2 icin Animated.loop baslatiliyor (satir 94-101) ancak useEffect cleanup'i yok; dondurulen animasyon nesnesi saklanip stop() edilmiyor. Bilesen unmount olduktan sonra loop calismaya devam eder.
   - _Repro:_ Oyun bileseni acilip kapatildiginda (onExit) sonsuz float animasyon donguleri durdurulmaz; tekrar tekrar acilip kapatildikca birikir, gereksiz kaynak tuketimi/uyari olusur.

17. **[UzayBloklari.tsx:185]** (state) handleGameComplete icindeki setTimeout/Animated callback temizlenmiyor: unmount sonrasi setState ve cift onGameEnd
   - handleGameComplete, rocket animasyonu bittiginde setShowConfetti(true) ve setTimeout(finishGame, 2000) tetikler (satir 185-188). Bu setTimeout ve Animated.start callback'i icin herhangi bir cleanup yok. Kullanici bu ~4 saniyelik roket/konfeti penceresi sirasinda ust-kose 'home' (onExit) ile ekrandan cikarsa ve parent bileseni unmount ederse, callback'ler yine calisir: unmount sonrasi setShowConfetti/setState uyarisi ve finishGame -> onGameEnd cagrisi. onExit ile onGameEnd farkli akislar oldugundan oyun hem cikis hem de tamamlanma olarak cift kaydedilebilir.
   - _Repro:_ Grid tamamlanir -> handleGameComplete -> rocket animasyonu baslar -> kullanici 2sn'lik setTimeout dolmadan onExit'e basip ekrani kapatir (parent unmount) -> setTimeout dolunca finishGame calisir -> onGameEnd unmount edilmis bileşenden tekrar cagrilir (potansiyel cift oyun-sonu kaydi + React unmounted setState uyarisi).

18. **[UzayBloklari.tsx:122]** (memory-leak) Star Animated.loop unmount'ta durdurulmuyor
   - useEffect icinde Animated.loop(...).start() cagrilir (satir 121-128) ancak effect bir cleanup dondurmez; dondurulen animasyon nesnesi bir ref'te tutulup unmount'ta .stop() edilmez. Bilesen kaldirildiginda dongu calismaya devam eder. useNativeDriver:true oldugundan JS-taraf setState olmaz ama native animasyon dongusu bosuna calismaya devam eder (kaynak/temizlik sizintisi).
   - _Repro:_ Bilesen mount edilir (loop baslar) -> kullanici oyundan cikar (unmount) -> Animated.loop hicbir zaman stop edilmedigi icin animasyon dongusu arka planda calismaya devam eder; ayni ekran defalarca acilip kapandikca birikir.


## Yas-Uygunluk Denetimi — 20 gecerli / +75 kismen

### HIGH (2)

1. **[Miktar Avcisi]** (okuma-bagimliligi) Tur sorusu (COK/AZ) sadece yazi ile veriliyor, her tur rastgele degisiyor
   - Okul oncesi cocuk (24-72 ay) okuyamaz. Dogru cevabi belirleyen tek ipucu olan COK/AZ sorusu her turda rastgele degistigi halde yalnizca yaziyla sunuluyor; okuyamayan cocuk o tur cok mu yoksa az mi istendigini bilemez, oyunu sansa dayali oynar.
   - _Oneri:_ Her tur basinda soru tipini (daha COK / daha AZ) TTS ile sesli okut; ayrica renk yaninda net bir gorsel sembol ekle (orn. buyuyen/kuculen ok, buyuk/kucuk daire) ki okuma gerektirmesin.

2. **[Renkli Baglantilar]** (okuma-bagimliligi) Mobilde sesli yonerge yok, kurallar sadece yazi ile veriliyor
   - Okul oncesi cocuk (24-72 ay) yaziyi okuyamaz. Mobilde sesli karsilik olmadigi icin oyunun nasil oynanacagi (ayni renk + komsu + en az 3 topu surukleme) cocuga hicbir kanaldan aktarilmiyor; yetiskin olmadan oyun anlasilamaz.
   - _Oneri:_ Yonergeyi hem web hem mobilde TTS ile seslendirin; ayrica kurali kelimeler yerine kisa animasyonlu bir gorsel demo (ornek bir baglanti/patlama animasyonu) ile gosterin.

### MEDIUM (15)

1. **[Hafiza (Ciftini Bul)]** (okuma-bagimliligi) Mobilde acilis yonergesi ne sesli okunuyor ne de ekranda gosteriliyor
   - Mobil cihazda okul oncesi cocuk hicbir yonerge almadan sadece 5-4-3-2-1 geri sayima maruz kaliyor; ne yapacagini anlayamiyor.
   - _Oneri:_ Mobilde de acilis yonergesini sesli oku (expo-speech vb.) veya en azindan gorsel/isaretli bir yonerge goster; sadece yaziya guvenme.

2. **[Mutfak Dedektifi]** (olumsuz-geribildirim) Oyun sonu ekraninda cocuga hata sayisi kirmizi carpi ile gosteriliyor
   - Oyun ici sayaclar okul oncesi icin bilerek kaldirilmisken (satir 537 yorumu) bitis ekraninda '❌ Hata' ve sayisi cocuga sunuluyor. Bu cezalandirici/cesaret kirici bir mesajdir; bu yasta basari duygusu ve pozitif pekistirme onceliklidir.
   - _Oneri:_ Cocuga donuk kutlama ekranindan hata sayisini kaldirin (hata verisi zaten Supabase'e ogretmen/veli icin kaydediliyor); sadece olumlu ogeleri (yildiz, dogru sayisi, kupa) gosterin.

3. **[Sayi Komsulari]** (okuma-bagimliligi) Tek yonerge sadece yazili metin, sesli/gorsel karsiligi yok
   - Okul oncesi cocuk (24-72 ay) okuyamaz. Oyunun ne istedigini anlatan tek metin yazili oldugundan ve sesli karsiligi olmadigindan, bagimsiz okuyamayan cocuk gorevi anlayamaz. Ozellikle bagimsiz oynama tamamen imkansiz hale gelir.
   - _Oneri:_ Yonergeyi (Boşluğa hangi sayı gelir?) otomatik olarak seslendirin (TTS) ve tekrar dinleme icin bir hoparlor butonu ekleyin. Sayilar da secildiginde/gosterildiginde sesli okunmali; boylece yazi okuyamayan cocuk da oynayabilir.

4. **[Bunu Soyle]** (okuma-bagimliligi) Yönergeler ve soru tamamen yazıya bağlı, sesli/TTS karşılığı yok
   - 24-72 ay çocuk okuma bilmez. Ne yapması gerektiğini (basılı tut, konuş, bırak) yazıdan anlayamaz; her aşamada yetişkin okuması gerekir, oyun tek başına oynanamaz.
   - _Oneri:_ Her aşamada yönergeyi ve 'Resimdeki nedir?' sorusunu sesli anlatan bir TTS/ses kaydı ekleyin; buton üstüne animasyonlu bir el/parmak ipucu koyun ki basılı tutma jesti sözsüz de anlaşılsın.

5. **[Bunu Soyle]** (olumsuz-geribildirim) Cezalandırıcı '❌' ve yanlış algılanan kelimeyi gösteren geri bildirim
   - Okul öncesi çocukta 'X / yanlış' işareti ve çocuğun söylediğinin yanlış yazımıyla (örn. gürültüden kaynaklı saçma bir kelime) gösterilmesi cesaret kırıcıdır ve konuşma denemesini bastırabilir; bu yaşta hata yerine 'tekrar deneyelim' tarzı destekleyici iskele beklenir.
   - _Oneri:_ ❌ ve olumsuz kelime yansıtmasını kaldırın; hata durumunda sesli ve neşeli 'Aferin, bir daha deneyelim!' gibi nötr-pozitif geri bildirim verin, doğru telaffuzu model olarak sesli tekrar edin.

6. **[Bunu Soyle]** (zorluk) Konuşma tanıma (Whisper) çocuk telaffuzunda güvenilmez, haksız 'hata' üretir
   - 24-72 ay çocukların artikülasyonu henüz gelişmektedir ('araba' yerine 'aaba', 'kedi' yerine 'tedi' vb.). Yetişkin sesine göre eğitilmiş ASR bu telaffuzları sık yanlış tanır; doğru söyleyen çocuk bile 'hata' alır ve bu haksız başarısızlık motivasyonu düşürür.
   - _Oneri:_ Bu yaşta değerlendirmeyi 'geçti/kaldı' yerine 'denedi/söyledi' odağına çevirin; eşleşme olmasa bile denemeyi olumlu sayın (katılım ödülü). Eşleştirmeyi daha toleranslı yapın (fonetik/benzerlik) ve yanlış eşleşmede çocuğu hataya düşürmeyin.

7. **[Kodlama (Minik Kasif)]** (dokunma-hedefi-boyutu) Komut kutucuklari ve geri-al butonu okul oncesi parmak icin cok kucuk
   - Okul oncesi cocuklarda ince motor kontrol gelismekte oldugundan onerilen dokunma hedefi genelde ~60-75 px+ olmali. 26-40 px hedefler yanlis dokunmaya ve hayal kirikligina yol acar; ozellikle 24-48 ay icin cok kucuk.
   - _Oneri:_ Etkilesimli tum butonlari (ok tuslari, geri-al, cikis, ses, bolum) en az ~60 px yap; komut kutucuklarini buyut ve aralarina bosluk koy.

8. **[Golge Dedektifi]** (okuma-bagimliligi) Yonerge mobilde hic seslendirilmiyor, sadece yazi olarak veriliyor
   - Okul oncesi cocuk (24-72 ay) okuyamaz. Oyunun ne yapilacagini anlatan tek yonerge mobil cihazda ne sesli ne gorsel olarak cocuga ulasmiyor; cocuk oyuna yonergesiz basliyor. Eslestirme mekanigi gorsel olsa da 'ne yapmam gerekiyor' bilgisi tamamen okuma/yetiskin yardimina bagli kaliyor.
   - _Oneri:_ Yonerge metnini mobilde de TTS ile seslendirin (expo-speech), veya oyun basinda ornek bir eslestirmeyi animasyonla gosteren gorsel bir demo ekleyin. Yonergeyi tek cumle ve somut tutun: 'Hayvani golgesine surukle.'

9. **[Sihirli Tuval]** (olumsuz-geribildirim) Hatada patlama emojisi, tam ekran kırmızı flaş, sert sarsıntı ve titreşim cezalandırıcı
   - Küçük çocukta ani kırmızı flaş + titreşim + sarsıntı + patlama görseli irkiltici ve cezalandırıcıdır; pozitif iskeleleme yerine kaygı ve cesaret kırıklığı yaratır, deneme-yanılmayı caydırır.
   - _Oneri:_ Hata geri bildirimini yumuşatın: patlama/kırmızı flaş yerine nazik bir 'tekrar dene' animasyonu, sarsıntıyı ve titreşimi kaldırın ya da çok hafifletin, doğru rengi nazikçe ima eden pozitif ipucu verin.

10. **[Sihirli Tuval]** (zaman-baskisi) 5 dakikalık azalan geri sayım çubuğu ve süre bitince oyunu zorla bitirme
   - Sürekli boşalan görsel zaman çubuğu ve süre dolunca oyunun kesilmesi küçük çocukta zaman baskısı ve kaygı yaratır; okul öncesi serbest keşif/boyama etkinliğinde geri sayım gelişimsel olarak uygun değildir.
   - _Oneri:_ Geri sayımı kaldırın ya da opsiyonel yapın; boyama görevini süreyle sınırlamayın, çocuk kendi hızında tamamlasın. Zaman verisi arka planda toplanabilir ama çocuğa baskı yaratan çubuk gösterilmemeli.

11. **[Uzay Bloklari]** (zaman-baskisi) 180 saniyelik geri sayim ve azalan zaman cubugu kaygi yaratir, sure dolunca oyun biter
   - Okul oncesi cocukta gorunur geri sayim ve bosalan cubuk zaman baskisi ve kaygi olusturur; sure dolarsa cocuk gorevi bitiremeden oyun kapanir, bu da basarisizlik hissi verir. Bu yasta serbest tempo esastir.
   - _Oneri:_ Zaman sinirini kaldir veya sonlandirici olmaktan cikar; sureyi olcmek isteniyorsa arka planda gizli tut, cocuga bosalan cubuk/geri sayim gostermeden istedigi kadar oynamasina izin ver.

12. **[Ceviz Macera (hikaye)]** (okuma-bagimliligi) Sahne ve soru sesini tekrar dinleme (replay) butonu yok; okuma bilmeyen cocuk kacirirsa anlayamaz
   - Okul oncesi cocuk (24-72 ay) okuyamaz; hikayeyi ve secenekleri yalnizca sesle anlar. Dikkati bir an dagilir veya sesi kacirirsa, yeniden dinleyemedigi icin secenekleri yalnizca gorsele bakarak tahmin etmek zorunda kalir. Kucuk yasta dikkat suresi kisa oldugundan bu sik yasanir.
   - _Oneri:_ Hem sahne anlatimi hem soru sesi icin buyuk, gorunur bir 'Tekrar Dinle' (hoparlor ikonu) butonu ekleyin; secenek ekranindayken soru sesini istenildiginde tekrar oynatabilme saglayin.

13. **[Ceviz Macera (hikaye)]** (zaman-baskisi) Final sahnesinde 4 saniye sonra oyun otomatik kapaniyor; cocugun odul/kutlamayi izleme kontrolu yok
   - Kucuk cocuk odulu (rozet, konfeti, 'TEBRIKLER') yavas isler ve tekrar tekrar gormek/kutlamayi uzatmak ister. 4 saniyede zorla cikis, cocugun basari anini kendi hizinda yasamasini engeller ve ani kesinti hayal kirikligi yaratabilir.
   - _Oneri:_ Otomatik cikisi kaldirin veya sureyi uzatin; kutlama ekraninda cocugun kendi bastigi buyuk 'Tekrar Oyna' ve 'Cikis' butonlari birakip kontrolu cocuga/ogretmene verin.

14. **[Aile Sepeti (hikaye)]** (dikkat-suresi) Anlatiyi/soruyu tekrar dinleme (replay) butonu yok
   - 24-72 ay cocugun dikkat suresi kisadir; otomatik calan anlatiyi kacirirsa veya dikkati dagilirsa yonergeyi/secenek sorusunu tekrar dinleyemez. Okuma bilmedigi icin metne de bakamaz, oyunda ne yapacagini anlayamadan takilir.
   - _Oneri:_ Anlatiyi ve soru sesini tekrar calan buyuk, ikonlu bir 'tekrar dinle' butonu ekleyin (ozellikle phase==='choice' asamasinda gorunur olsun).

15. **[Aile Sepeti (hikaye)]** (bilissel-yuk) Ses yuklenemez/eksikse oyun ilerlemez, cikis disinda yol kalmaz
   - Ses calinmazsa (yukleme hatasi, sessiz cihaz, eksik dosya) ekran hareketsiz kalir ve kucuk cocuk secenekleri goremez; bu yasta cocuk durumu cozemez, engellenmislik/hayal kirikligi yasar.
   - _Oneri:_ Ses bitmese/eksik olsa bile secenekleri gosterecek bir zaman asimi (fallback timer) veya manuel 'devam/goster' dokunma alani ekleyin; boylece ilerleme yalnizca ses olayina bagli kalmasin.

### LOW (3)

1. **[Kodlama (Minik Kasif)]** (dil-karmasikligi) Sesli yonerge ile ekrandaki karakter tutarsiz (robot vs tavsan)
   - Okuma bilmeyen cocuk yonergeyi sesten anlar; 'robot' denip ekranda tavsan gormesi refere edileni karistirir, gorev anlamasini zorlastirir.
   - _Oneri:_ Karsilama metnini karakterle esitle (orn. 'Tavsani hedefe gotur!').

2. **[Rakam Yazma]** (soyut-kavram) İlerleme yüzde (%) olarak gösteriliyor; yüzde kavramı bu yaş için soyut ve okuma gerektiriyor
   - Okul öncesi çocuk yüzde (%73) ve kesir (3/5) kavramlarını anlamaz ve metni okuyamaz. Bu bilgi çocuğa hiçbir anlam taşımaz, yalnızca yetişkine yöneliktir.
   - _Oneri:_ Yüzde metnini çocuk için kaldır veya görsel dolan çubukla/yıldızlarla değiştir (zaten satır 420-422'de görsel çubuk mevcut, metin gereksiz). '1/5' yerine 5 nokta/yıldız ile tamamlanan rakamları görsel göster.

3. **[Sihirli Tuval]** (soyut-kavram) Bitiş ekranında çocuğa yönelik soyut 'Bilişsel Hız' metriği gösteriliyor
   - 'Bilişsel Hız 0.037' gibi soyut ondalıklı bir metrik okul öncesi çocuk için anlamsızdır ve çocuğa gösterilen ekranda yeri yoktur; bu veri öğretmen/veli paneline aittir.
   - _Oneri:_ Bilişsel hız ve hata gibi ölçüm metriklerini çocuk ekranından kaldırıp yalnızca öğretmen/veli raporuna taşıyın; çocuğa sadece kutlayıcı görsel geri bildirim gösterin.


## Oyun Bazli Tahmini Yas Hedefi (yas denetimi)

- **Bunu Soyle** — 3 gecerli bulgu. Hedef: İçerik kelime dağarcığı (Elma, Araba, Kedi, Top, Ev) 24-48 ay için uygun; ancak bas-konuş jesti, yazıya bağlı yönergeler ve ASR değerlendirmesi nedeniyle mevcut haliyle ~48-60 ay ve yetişkin desteği gerektiriyor.
- **Sihirli Tuval** — 3 gecerli bulgu. Hedef: 60-72 ay (1-10 sayı tanıma ve sembolik eşleme gerektirdiği için; 24-54 ay için uygun değil)
- **Kodlama (Minik Kasif)** — 2 gecerli bulgu. Hedef: 60-72 ay (5-6 yas). Ertelenmis komut dizisi olusturup calistirma, 4x4 gridde engel etrafinda 5-6 adimlik sirali plan kurma ve zihinsel simulasyon gerektiginden oyun okul oncesinin ust bandina uygun; 24-48 ay icin fazla soyut ve zor.
- **Ceviz Macera (hikaye)** — 2 gecerli bulgu. Hedef: 48-72 ay (sesli anlatilan dallanan hikaye; isbirligi/problem cozme temasi, sayi/islem yok). Alt sinir yaklasik 42 ay; 24-36 ay icin dil ve kavramlar bir miktar ileri.
- **Aile Sepeti (hikaye)** — 2 gecerli bulgu. Hedef: 48-72 ay (4-6 yas). Dallanan hikaye anlatisini takip edip yansitici bir sosyal-duygusal secim yapmayi gerektirdigi icin 24-36 ay grubu icin kavramsal olarak fazla ileridir; okuma gerektirmeyen sesli anlati ve buyuk resim butonlari sayesinde 4-6 yas icin uygundur.
- **Hafiza (Ciftini Bul)** — 1 gecerli bulgu. Hedef: 48-72 ay (asamali 4->10 kart ilerlemesi ve gorsel bellek gorevi bu araliga uygun; 24-36 ay icin son asamalar ve yazi bagimliligi fazla)
- **Mutfak Dedektifi** — 1 gecerli bulgu. Hedef: 48-72 ay (dosya 36-72 ay/3-6 yas hedefliyor, ancak sesli oyun ici geri bildirim eksikligi, domates celdiricisi ve iki adimli yonerge nedeniyle gercekte 48 ay alti icin uygun degil)
- **Miktar Avcisi** — 1 gecerli bulgu. Hedef: 54-72 ay (yaklasik 4.5-6 yas). Ileri turlardaki 10'a kadar yakin miktar karsilastirmalari ve okuma gerektiren COK/AZ sorusu nedeniyle 24-48 ay icin uygun degil.
- **Sayi Komsulari** — 1 gecerli bulgu. Hedef: 54-72 ay (yaklasik 4.5-6 yas). Sayilarin 10'a kadar cikmasi, "onceki/sonraki/arasindaki" sayi kavrami ve yazi tabanli tek yonerge dikkate alindiginda oyun okul oncesinin ust yas grubuna uygundur; 24-48 ay icin fazla ileridir.
- **Rakam Yazma** — 1 gecerli bulgu. Hedef: 48-72 ay (rakam 1-5 tanıma + izleme becerisi gerektirir; alt sınır ~48 ay)
- **Golge Dedektifi** — 1 gecerli bulgu. Hedef: Yaklasik 48-72 ay. Erken turlar (3 hayvan, celdiricisiz) ~36 ay icin uygun; ancak ileri turlardaki 6 nesne + 2 celdirici, hassas surukle-birak isabeti ve seslendirilmeyen yazili yonergeler oyunu pratikte 60-72 ay araligina cekiyor. 24-48 ay grubu icin mevcut haliyle uygun degil.
- **Uzay Bloklari** — 1 gecerli bulgu. Hedef: 54-72 ay (uzamsal blok yerlestirme + alan dondurme + zaman siniri nedeniyle kucuk yaslara uygun degil; ideal olarak 5-6 yas)
- **Renkli Baglantilar** — 1 gecerli bulgu. Hedef: 60-72 ay (ve ustu), yetiskin destegiyle; kesintisiz surukleme, '3+' soyut kurali ve match-3 mantigi nedeniyle 24-48 ay icin uygun degil
- **Siralama** — 0 gecerli bulgu. Hedef: 48-72 ay
- **Eksik Sayi Bul** — 0 gecerli bulgu. Hedef: 48-72 ay (sayi araligi 1-5 uygun olsa da dizi tamamlama kavrami ve hassas surukle-birak mekanigi alt sinir icin ileri; 24-47 ay icin uygun degil)
- **Gruplama** — 0 gecerli bulgu. Hedef: 48-72 ay (icerik kavrami basit ama sesli yonerge olmamasi ve yazi bagimliligi kucuk yasi disliyor)
- **Diziyi Tamamla** — 0 gecerli bulgu. Hedef: 48-72 ay (özellikle ABC üçlü örüntüler nedeniyle üst uç 60-72 aya kayıyor; 24-42 ay için hem yönerge eksikliği hem zorluk fazla)
- **Kutuyu Bul** — 0 gecerli bulgu. Hedef: 48-72 ay (aynı kategoriden ince görsel ayırt etme ve sesli yönerge olmaması nedeniyle 24-42 ay için uygun değil)
- **Sayilari Birlestir** — 0 gecerli bulgu. Hedef: 48-72 ay
- **Yapboz** — 0 gecerli bulgu. Hedef: 48-72 ay (mevcut haliyle). 24-48 ay grubu icin parca sayisi, okuma bagimliligi ve ince motor hassasiyeti nedeniyle uygun degil.
- **Onluk Cerceve** — 0 gecerli bulgu. Hedef: 48-72 ay (4-6 yaş). Onluk çerçeve ile 1-10 sayı kompozisyonu, rakam tanıma ve tekrarlı sürükleme gerektirdiği için 24-42 ay grubu için ileri seviyedir.
- **Tarti Dengesi** — 0 gecerli bulgu. Hedef: 60-72 ay (mevcut haliyle rakam tanima ve sembolik esitlik gerektirdiginden alt sinir yuksek; 24-48 ay icin uygun degil)
- **Sihirli Siseler** — 0 gecerli bulgu. Hedef: 54-72 ay (mekanik gercekci olarak 60+ ay; kod 24-42 ay dilimine de aciyor ancak bu yas icin uygun degil)
- **Hayal Defteri (Cizim)** — 0 gecerli bulgu. Hedef: Cekirdek cizim (dokun-ciz) 24 ay+ uygun; gelismis araclar (firca modlari, sekiller, boyutlar) 48-72 ay araligina daha uygun. Genel olarak yasa uygun bir serbest yaratim oyunu (timer/puan/kaybetme yok).
- **Adalet Hikayesi (hikaye)** — 0 gecerli bulgu. Hedef: 54-72 ay (hikaye teması adalet/eşitlik/paylaşım gibi soyut değerler içerdiği için okul öncesinin üst yaşları)

## Kismen gecerli (baglama bagli, 75 adet) — ozet basliklar

- [Hafiza (Ciftini Bul)] (okuma-bagimliligi) Oyun ici tum yonerge ve geri bildirimler yalnizca yazi ile; sesli karsiligi yok
- [Hafiza (Ciftini Bul)] (olumsuz-geribildirim) Her eslesmeyen cift icin cezalandirici 'uh-oh' hata sesi ve titreme animasyonu
- [Hafiza (Ciftini Bul)] (dil-karmasikligi) 'Asama' gibi soyut kelime ve gecis metinleri kucuk yas ucundaki cocuk icin anlasilmaz
- [Hafiza (Ciftini Bul)] (sayi-araligi) Son asamalarda 10 kart / 5 cift, yas araliginin kucuk ucu icin calisma bellegini asabilir
- [Siralama] (okuma-bagimliligi) Sirada tiklanacak sayi her turda sesli soylenmiyor, sadece yazi/rakam ile gosteriliyor
- [Siralama] (okuma-bagimliligi) Geri sayim ekranindaki yonergeler sadece yazi ile veriliyor, sesli karsiligi yok
- [Siralama] (olumsuz-geribildirim) Hatali secimde geri bildirim sadece web'de sesli; native'de yalnizca kirmizi titreme ile ceza gorunumu
- [Eksik Sayi Bul] (okuma-bagimliligi) Tum yonergeler yalnizca yazi ile veriliyor, sesli/gorsel karsiligi yok
- [Eksik Sayi Bul] (ince-motor) Hassas surukle-birak; sayinin tam olarak hedef kutu icine birakilmasi gerekiyor
- [Eksik Sayi Bul] (soyut-kavram) Sayi dizisinde 'eksik ogeyi' bulma kucuk yaslar icin soyut/ileri bir kazanim
- [Gruplama] (okuma-bagimliligi) Yonerge ve secenekler icin sesli okuma (TTS) yok, yazi bagimliligi var
- [Gruplama] (dil-karmasikligi) 'Bu nesne hangisi?' yonergesi soyut ve dilbilgisel olarak bulanik
- [Mutfak Dedektifi] (okuma-bagimliligi) Oyun ici geri bildirim ve durum mesajlari sadece yazi ile veriliyor, sesli/gorsel karsiligi yok
- [Mutfak Dedektifi] (soyut-kavram) Domates celdiricisi okul oncesi icin fazla soyut ve kulturel olarak belirsiz siniflandirma bekliyor
- [Mutfak Dedektifi] (dil-karmasikligi) Giris yonergesi iki adimli ve en kucuk yas icin bilinmeyen kelime iceriyor
- [Mutfak Dedektifi] (gorsel-karmasiklik) Ekranda ayni anda cok sayida hareketli dikkat dagitici oge var
- [Miktar Avcisi] (sayi-araligi) Ileri turlarda 10'a kadar ve cok yakin miktar karsilastirmasi (8'e 9, 9'a 10)
- [Miktar Avcisi] (bilissel-yuk) COK/AZ kurali her turda rastgele degisiyor (kural degistirme / inhibisyon yuku)
- [Sayi Komsulari] (soyut-kavram) Uc farkli kural (onceki/sonraki/arasindaki) ayni gorunumle, ipucusuz sunuluyor
- [Sayi Komsulari] (olumsuz-geribildirim) Yanlis cevapta duzeltici iskele yok, sadece kirmizi isik gosterilip siliniyor
- [Sayi Komsulari] (dokunma-hedefi-boyutu) Secenek butonlari kucuk ekranlarda kucuk kalabilir
- [Diziyi Tamamla] (okuma-bagimliligi) Oyunda sesli/görsel yönerge yok; çocuk ne yapacağını okuyamaz
- [Diziyi Tamamla] (zorluk) ABC üçlü tekrar örüntüleri küçük yaş için fazla ileri
- [Diziyi Tamamla] (olumsuz-geribildirim) Yanlış seçimde ceza sesi + kırmızı/sarsıntı, pozitif iskele mesajı yok
- [Bunu Soyle] (ince-motor) Bas-konuş (push-to-talk): basılı tutup konuşup bırakma koordinasyonu küçük yaşa zor
- [Bunu Soyle] (dil-karmasikligi) Teknik/soyut durum metinleri ('SİSTEM DİNLİYOR', 'Analiz Ediliyor')
- [Kodlama (Minik Kasif)] (soyut-kavram) Ertelenmis calistirma + cok adimli sekans planlama okul oncesinin alt yasi icin fazla soyut
- [Kodlama (Minik Kasif)] (olumsuz-geribildirim) Basarisizlikta 'kaybetme' durumu ve uzgun yuz cesaret kirici
- [Rakam Yazma] (okuma-bagimliligi) Ana yönerge ve tüm ekran metinleri sadece yazı ile, sesli/TTS karşılığı yok
- [Rakam Yazma] (ince-motor) Başarı için %90 nokta kapsama eşiği; küçük yaşta hassas izleme için zorlayıcı
- [Rakam Yazma] (dokunma-hedefi-boyutu) Renk seçim butonları 36x36 px; küçük parmaklar için önerilen dokunma hedefinin altında
- [Kutuyu Bul] (gorsel-karmasiklik) Hedef, aynı kategoriden 4 benzer emoji arasında aranıyor (ince görsel ayırt etme çok zor)
- [Kutuyu Bul] (okuma-bagimliligi) Yönerge yalnızca yazılı; sesli okuma (TTS) yok
- [Kutuyu Bul] (olumsuz-geribildirim) Yanlış seçimde uyarıcı ses + kırmızı X ve hata sayımı
- [Sayilari Birlestir] (okuma-bagimliligi) Yonergeler yalnizca yazi ile veriliyor, sesli/TTS karsiligi yok
- [Sayilari Birlestir] (ince-motor) Serbest cizim ile nokta birlestirme kucuk yas icin hassas motor beceri gerektiriyor
- [Yapboz] (okuma-bagimliligi) Tum yonergeler yalnizca yazi ile veriliyor, sesli/TTS karsiligi yok
- [Yapboz] (bilissel-yuk) 'Resmi Hatirla' hafiza cercevesi + onizlemenin 2.5 sn sonra otomatik kaybolmasi
- [Yapboz] (zorluk) Sabit 3x3 (9 parca) yapboz, yas/zorluk olceklendirmesi yok
- [Yapboz] (ince-motor) Kucuk parcalarla hassas surukle-birak; 50 px yakalama toleransi
- [Golge Dedektifi] (okuma-bagimliligi) Tur, basari ve motivasyon metinleri sadece yazi ile veriliyor
- [Golge Dedektifi] (zorluk) Ileri turlarda 6 hayvan + 2 celdirici golge kucuk yas icin agir
- [Golge Dedektifi] (ince-motor) Suruklenip birakilan hedef golgeler kucuk ve hassas isabet gerektiriyor
- [Golge Dedektifi] (dikkat-suresi) 10 tur sabit; kisa dikkat suresi icin uzun olabilir
- [Onluk Cerceve] (okuma-bagimliligi) Tüm yönergeler yalnızca yazı ile veriliyor, sesli/TTS karşılığı yok
- [Onluk Cerceve] (sayi-araligi) Rakam olarak 6-10 hedefleri küçük yaş için ileri; hedef yalnızca rakamla gösteriliyor
- [Onluk Cerceve] (dikkat-suresi) 10 tur ve tur başına çok sayıda sürükleme dikkat süresini aşabilir
- [Tarti Dengesi] (okuma-bagimliligi) Yonerge ve ipucu yalnizca yazi ile veriliyor, sesli/gorsel karsiligi yok
- [Tarti Dengesi] (soyut-kavram) Miktar yalnizca rakam + 'kg' ve esitlik ('=') notasyonu ile temsil ediliyor, somut gorsel miktar yok
- [Tarti Dengesi] (sayi-araligi) Ileri turlarda 6-10 arasi sayilar ve 1-9 arasi celdiriciler kucuk yas icin fazla ileri
- [Tarti Dengesi] (ince-motor) Dogru birakma yukari surukleme jestine bagli; kucuk secenek butonlari
- [Tarti Dengesi] (olumsuz-geribildirim) Yanlis secimde duzeltici iskele/ipucu verilmeden terazi devriliyor ve deneme siliniyor
- [Sihirli Siseler] (okuma-bagimliligi) Oyunun tek kurali sadece yazi ile aciklaniyor, sesli/gorsel karsiligi yok
- [Sihirli Siseler] (bilissel-yuk) Su-siralama (water sort) mekanigi kucuk yas icin cok ileri planlama gerektiriyor
- [Sihirli Siseler] (okuma-bagimliligi) Geri bildirim, kutlama ve butonlar okuma gerektiriyor
- [Sihirli Siseler] (dil-karmasikligi) Soyut ve yas ustu kelimeler kullaniliyor
- [Sihirli Siseler] (gorsel-karmasiklik) Ekran dikkat dagitici dekoratif ogelerle kalabalik
- [Sihirli Tuval] (sayi-araligi) Oyunun tamamı 1-10 sayı tanıma ve sembolik eşlemeye dayanıyor
- [Sihirli Tuval] (okuma-bagimliligi) Bölge-renk eşlemesi yalnızca yazılı sayı ile veriliyor, sesli/görsel karşılığı yok
- [Sihirli Tuval] (dokunma-hedefi-boyutu) Bazı SVG bölgeleri çok küçük; hassas dokunma gerektiriyor
- [Uzay Bloklari] (okuma-bagimliligi) Oyun ici yonergeler yalnizca yazi ile veriliyor, sesli/gorsel karsiligi yok
- [Uzay Bloklari] (bilissel-yuk) 'Alani Dondur' (izgarayi 90 derece dondurme) mekanigi soyut ve kafa karistirici
- [Uzay Bloklari] (dil-karmasikligi) Bitis ve karsilama metinleri soyut/uzun ifadeler iceriyor
- [Uzay Bloklari] (olumsuz-geribildirim) Hata sayaci kirmizi ile vurgulaniyor ve hatali dokunuşta 'u-oh' sesi caliyor
- [Renkli Baglantilar] (soyut-kavram) '3+' matematiksel gosterimi bu yas icin anlasilmaz
- [Renkli Baglantilar] (ince-motor) Kesintisiz hassas surukleyerek zincir kurma bu yas icin zor
- [Renkli Baglantilar] (olumsuz-geribildirim) Gorunur 'Hata' sayaci cezalandirici ve cesaret kirici
- [Renkli Baglantilar] (bilissel-yuk) Ayni anda uc kural birlestirme kucuk yas icin agir
- [Hayal Defteri (Cizim)] (dokunma-hedefi-boyutu) Bazi dokunma hedefleri okul oncesi ince motor icin kucuk
- [Hayal Defteri (Cizim)] (bilissel-yuk) Ayni anda cok fazla arac ve ic ice acilir menu
- [Ceviz Macera (hikaye)] (dil-karmasikligi) Giris metni alt yas bandi (24-36 ay) icin uzun ve soyut kavramlar iceriyor
- [Aile Sepeti (hikaye)] (ince-motor) Ses seviyesi kaydiraci kucuk cocuk parmagi icin ince kontrol gerektirir
- [Adalet Hikayesi (hikaye)] (soyut-kavram) Eşitlik vs. ihtiyaca-göre-adalet ayrımı bu yaş için fazla soyut
- [Adalet Hikayesi (hikaye)] (bilissel-yuk) Seçenekler yalnızca soyut ikon; tek seferlik anlatıyı hafızadan eşleştirme yükü
- [Adalet Hikayesi (hikaye)] (dikkat-suresi) Anlatı/soru sesi için tekrar-dinle (replay) kontrolü yok
