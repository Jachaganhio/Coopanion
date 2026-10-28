// Human-facing text. Model instructions live in model-text.ts.
const translations = {
  "en": [
    "Source|Task|Project|Observed state|Observed at|Answer",
    "Started|Activity|Needs attention|Turn ended|Failed|Cancelled|Unknown",
    "Local monitoring|Task states|Running|Needs attention|Completed|Connected|Offline|Read error|View answer|Answer excerpt|OK|Monitor connected",
    "Notification mode|Notify task start|Show connection notice|Show project names|Codex home (blank: automatic)|Claude Code home (blank: automatic)",
    "Enable the World to monitor local tasks. model sends answer excerpts to the configured model and may use quota; status only shows the task list. Direct bubbles require host support."
  ],
  "zh": [
    "来源|任务|项目|观察到的状态|观察时间|答复",
    "开始|运行活动|需要操作|轮次结束|失败|中断|未知",
    "本机监控|任务状态|运行中|需要操作|已完成|已连接|未连接|读取失败|查看答复|答复摘录|知道了|任务监控已连接",
    "提醒方式|提醒任务开始|显示连接提示|显示项目名|Codex 数据目录（留空自动查找）|Claude Code 数据目录（留空自动查找）",
    "启用 World 即监控本机任务。model 会把答复摘录交给已配置的模型，可能消耗额度；status 只显示任务列表。直接气泡需要宿主支持。"
  ],
  "zh-Hant": [
    "來源|任務|專案|觀察到的狀態|觀察時間|答覆",
    "開始|執行活動|需要操作|回合結束|失敗|中斷|未知",
    "本機監控|任務狀態|執行中|需要操作|已完成|已連線|未連線|讀取失敗|查看答覆|答覆摘錄|知道了|任務監控已連線",
    "提醒方式|提醒任務開始|顯示連線提示|顯示專案名稱|Codex 資料目錄（留空自動尋找）|Claude Code 資料目錄（留空自動尋找）",
    "啟用 World 即監控本機任務。model 會將答覆摘錄交給已設定的模型，可能消耗額度；status 僅顯示任務清單。直接氣泡需要宿主支援。"
  ],
  "ja": [
    "ソース|タスク|プロジェクト|観測した状態|観測時刻|回答",
    "開始|実行中|操作が必要|ターン終了|失敗|中断|不明",
    "ローカル監視|タスクの状態|実行中|操作が必要|完了|接続済み|未接続|読み取りエラー|回答を表示|回答の抜粋|確認|タスク監視に接続しました",
    "通知モード|タスク開始を通知|接続通知を表示|プロジェクト名を表示|Codex ディレクトリ（空欄で自動）|Claude Code ディレクトリ（空欄で自動）",
    "World を有効にするとローカルタスクを監視します。model は回答の抜粋を設定済みモデルに送り、利用枠を消費する場合があります。status はタスク一覧のみ表示します。直接の吹き出しにはホストの対応が必要です。"
  ],
  "ko": [
    "출처|작업|프로젝트|관측한 상태|관측 시각|답변",
    "시작|실행 활동|조작 필요|턴 종료|실패|중단|알 수 없음",
    "로컬 모니터링|작업 상태|실행 중|조작 필요|완료|연결됨|연결 안 됨|읽기 오류|답변 보기|답변 발췌|확인|작업 모니터링이 연결되었습니다",
    "알림 방식|작업 시작 알림|연결 알림 표시|프로젝트 이름 표시|Codex 경로 (비우면 자동)|Claude Code 경로 (비우면 자동)",
    "World를 켜면 로컬 작업을 모니터링합니다. model은 답변 발췌를 설정한 모델에 보내며 사용량을 소모할 수 있습니다. status는 작업 목록만 표시합니다. 직접 말풍선은 호스트 지원이 필요합니다."
  ],
  "fr": [
    "Source|Tâche|Projet|État observé|Observation|Réponse",
    "Démarré|Activité|Action requise|Tour terminé|Échec|Interrompu|Inconnu",
    "Suivi local|État des tâches|En cours|Action requise|Terminé|Connecté|Hors ligne|Erreur de lecture|Voir la réponse|Extrait de réponse|OK|Suivi des tâches connecté",
    "Mode de notification|Notifier le démarrage|Afficher la connexion|Afficher les noms des projets|Dossier Codex (vide : automatique)|Dossier Claude Code (vide : automatique)",
    "Activez le World pour suivre les tâches locales. model envoie des extraits au modèle configuré et peut consommer du quota ; status affiche uniquement la liste. Les bulles directes nécessitent la prise en charge de l’hôte."
  ],
  "de": [
    "Quelle|Aufgabe|Projekt|Beobachteter Status|Beobachtet um|Antwort",
    "Gestartet|Aktivität|Aktion erforderlich|Durchlauf beendet|Fehlgeschlagen|Abgebrochen|Unbekannt",
    "Lokale Überwachung|Aufgabenstatus|Aktiv|Aktion erforderlich|Beendet|Verbunden|Offline|Lesefehler|Antwort anzeigen|Antwortauszug|OK|Aufgabenüberwachung verbunden",
    "Benachrichtigungsmodus|Aufgabenstart melden|Verbindungsmeldung anzeigen|Projektnamen anzeigen|Codex-Verzeichnis (leer: automatisch)|Claude-Code-Verzeichnis (leer: automatisch)",
    "Aktivieren Sie den World zur Überwachung lokaler Aufgaben. model sendet Antwortauszüge an das konfigurierte Modell und kann Kontingent verbrauchen; status zeigt nur die Aufgabenliste. Direkte Sprechblasen erfordern Unterstützung durch den Host."
  ],
  "es-419": [
    "Origen|Tarea|Proyecto|Estado observado|Hora de observación|Respuesta",
    "Iniciada|Actividad|Requiere acción|Turno terminado|Falló|Interrumpida|Desconocido",
    "Monitoreo local|Estado de tareas|En ejecución|Requiere acción|Terminada|Conectado|Sin conexión|Error de lectura|Ver respuesta|Extracto de respuesta|Aceptar|Monitoreo de tareas conectado",
    "Modo de aviso|Avisar al iniciar|Mostrar aviso de conexión|Mostrar nombres de proyectos|Carpeta Codex (vacío: automática)|Carpeta Claude Code (vacío: automática)",
    "Activa el World para monitorear tareas locales. model envía extractos al modelo configurado y puede consumir cuota; status solo muestra la lista. Las burbujas directas requieren soporte de la aplicación anfitriona."
  ],
  "pt-BR": [
    "Origem|Tarefa|Projeto|Estado observado|Horário observado|Resposta",
    "Iniciada|Atividade|Requer ação|Turno encerrado|Falhou|Interrompida|Desconhecido",
    "Monitoramento local|Estado das tarefas|Em execução|Requer ação|Concluída|Conectado|Offline|Erro de leitura|Ver resposta|Trecho da resposta|OK|Monitoramento de tarefas conectado",
    "Modo de aviso|Avisar início da tarefa|Mostrar aviso de conexão|Mostrar nomes de projetos|Pasta Codex (vazio: automática)|Pasta Claude Code (vazio: automática)",
    "Ative o World para monitorar tarefas locais. model envia trechos ao modelo configurado e pode consumir cota; status mostra apenas a lista. Balões diretos exigem suporte do aplicativo anfitrião."
  ],
  "it": [
    "Origine|Attività|Progetto|Stato osservato|Ora osservata|Risposta",
    "Avviata|In corso|Azione richiesta|Turno terminato|Fallita|Interrotta|Sconosciuto",
    "Monitoraggio locale|Stato delle attività|In esecuzione|Azione richiesta|Completata|Connesso|Offline|Errore di lettura|Visualizza risposta|Estratto della risposta|OK|Monitoraggio attività connesso",
    "Modalità di avviso|Notifica avvio attività|Mostra avviso di connessione|Mostra nomi dei progetti|Cartella Codex (vuota: automatica)|Cartella Claude Code (vuota: automatica)",
    "Attiva il World per monitorare le attività locali. model invia estratti al modello configurato e può consumare quota; status mostra solo l’elenco. I fumetti diretti richiedono il supporto dell’applicazione ospitante."
  ],
  "ru": [
    "Источник|Задача|Проект|Наблюдаемый статус|Время наблюдения|Ответ",
    "Начато|Активность|Требуется действие|Ход завершён|Ошибка|Прервано|Неизвестно",
    "Локальный мониторинг|Статусы задач|Выполняется|Требуется действие|Завершено|Подключено|Нет соединения|Ошибка чтения|Показать ответ|Выдержка из ответа|Понятно|Мониторинг задач подключён",
    "Режим уведомлений|Уведомлять о начале|Показывать подключение|Показывать названия проектов|Папка Codex (пусто: автоматически)|Папка Claude Code (пусто: автоматически)",
    "Включите World для мониторинга локальных задач. model отправляет выдержки настроенной модели и может расходовать квоту; status показывает только список. Для прямых пузырьков нужна поддержка приложения."
  ]
} as const;
export type MonitorLanguage = keyof typeof translations;
export function strings(language: string = process.env.CORTICO_LANGUAGE || 'en') {
  const row=translations[language as MonitorLanguage] || translations.en;
  const [columns,states,ui,fields]=row.slice(0,4).map(s=>s.split('|'));
  const names=['started','running','needs_attention','completed','failed','cancelled','unknown'];
  return {columns,statuses:Object.fromEntries(names.map((name,i)=>[name,states[i]])),local:ui[0],tasks:ui[1],running:ui[2],attention:ui[3],completed:ui[4],connected:ui[5],offline:ui[6],error:ui[7],answer:ui[8],excerpt:ui[9],ok:ui[10],greeting:ui[11],fields,description:row[4]};
}
