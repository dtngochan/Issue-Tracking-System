const API = '/api';
let currentUser = null;
let projects = [], issues = [], activeIssue = null;
let sevChart = null, statChart = null;

const roleMap = { 1: 'ADMIN', 2: 'PM', 3: 'DEV', 4: 'DEV', 5: 'QA', 6: 'QA' };

document.addEventListener('DOMContentLoaded', () => { 
  checkLogin(); 
});

function checkLogin() {
  const savedUser = localStorage.getItem('its_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showAppScreen();
  } else {
    showLoginScreen();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  try {
    const r = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const d = await r.json();
    if (r.ok) {
      const u = d.user;
      u.role = u.global_role === 'ADMIN' ? 'ADMIN' : (roleMap[u.user_id] || 'DEV');
      localStorage.setItem('its_user', JSON.stringify(u));
      currentUser = u;
      showAppScreen();
    } else {
      alert(d.error);
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối máy chủ!');
  }
}

function handleLogout() {
  localStorage.removeItem('its_user');
  currentUser = null;
  showLoginScreen();
}

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display = 'none';
}

function showAppScreen() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'block';
  
  // Set header info
  document.getElementById('headerUserName').textContent = currentUser.full_name;
  document.getElementById('headerUserRole').textContent = `Vai trò: ${currentUser.role}`;
  
  // Setup tabs visibility based on role (RBAC)
  setupRBACTabs();
  
  // Default tab
  switchTab('dashboardTab');
}

function setupRBACTabs() {
  const role = currentUser.role;
  const tabCreate = document.getElementById('tab-create');
  const tabProjects = document.getElementById('tab-projects');
  const tabAdmin = document.getElementById('tab-admin');
  
  // Reset visibility
  tabCreate.style.display = 'inline-flex';
  tabProjects.style.display = 'inline-flex';
  tabAdmin.style.display = 'none';
  
  if (role === 'DEV') {
    tabCreate.style.display = 'none';
    tabProjects.style.display = 'none';
  } else if (role === 'QA') {
    tabProjects.style.display = 'none';
  } else if (role === 'ADMIN') {
    tabAdmin.style.display = 'inline-flex';
  }
}

const componentCache = {};

async function switchTab(id) {
  document.querySelectorAll('.tab-content').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  
  const section = document.getElementById(id);
  section.style.display = 'block';
  if(event && event.currentTarget) event.currentTarget.classList.add('active');
  
  let compName = '';
  if (id === 'dashboardTab') compName = 'dashboard';
  if (id === 'issuesTab') compName = 'issues';
  if (id === 'createIssueTab') compName = 'triage';
  if (id === 'projectsTab') compName = 'projects';
  if (id === 'adminTab') compName = 'admin';

  if (!componentCache[compName]) {
    try {
      const r = await fetch(`components/${compName}.html`);
      const html = await r.text();
      section.innerHTML = html;
      componentCache[compName] = true;
    } catch(e) { console.error('Loi tai component:', e); }
  }

  // Reload data
  if (id === 'dashboardTab') setTimeout(loadDashboard, 100);
  if (id === 'issuesTab') setTimeout(loadIssues, 100);
  if (id === 'createIssueTab') setTimeout(prepareCreateForm, 100);
  if (id === 'projectsTab') setTimeout(loadProjects, 100);
  if (id === 'adminTab') setTimeout(loadUsers, 100);
}

function showModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ====== 1. DASHBOARD ======
async function loadDashboard() {
  try {
    let url = `${API}/dashboard/summary?user_id=${currentUser.user_id}`;
    const pid = document.getElementById('filterDashboardProject')?.value;
    if (pid) url += `&project_id=${pid}`;
    const r = await fetch(url);
    const d = await r.json();
    document.getElementById('statTotal').textContent = d.total_issues;
    document.getElementById('statCritical').textContent = d.critical_issues;
    document.getElementById('statReopen').textContent = d.reopen_rate_percent + '%';
    document.getElementById('statMTTR').textContent = d.mttr_hours_avg + 'h';
    document.getElementById('statInProgress').textContent = d.in_progress_issues;
    document.getElementById('statClosed').textContent = d.closed_issues;
    renderCharts(d.severity_breakdown, d.status_breakdown);
    renderPerfStats(d.qa_stats, d.dev_stats);
    
    // Populate dropdowns if not populated yet
    const fdp = document.getElementById('filterDashboardProject');
    if (fdp && fdp.options.length <= 1) {
      const pUrl = currentUser.role === 'ADMIN' ? `${API}/projects` : `${API}/projects?user_id=${currentUser.user_id}`;
      const pRes = await fetch(pUrl);
      const myProjects = await pRes.json();
      fdp.innerHTML = '<option value="">-- Tat ca Du an --</option>' + myProjects.map(p => `<option value="${p.project_id}">${p.project_name}</option>`).join('');
      
      const fp = document.getElementById('filterProject');
      if (fp) fp.innerHTML = '<option value="">-- Tat ca Du an --</option>' + myProjects.map(p => `<option value="${p.project_id}">${p.project_name}</option>`).join('');
    }
  } catch (e) { console.error(e); }
}

function renderCharts(sev, stat) {
  if (sevChart) sevChart.destroy();
  if (statChart) statChart.destroy();
  sevChart = new Chart(document.getElementById('severityChart').getContext('2d'), {
    type: 'doughnut',
    data: { labels: ['Critical','Major','Minor','Trivial'], datasets: [{ data: [sev.CRITICAL,sev.MAJOR,sev.MINOR,sev.TRIVIAL], backgroundColor: ['#ef4444','#f59e0b','#06b6d4','#94a3b8'] }] },
    options: { responsive: true, plugins: { legend: { labels: { color: '#fff', font: { size: 11 } } } } }
  });
  statChart = new Chart(document.getElementById('statusChart').getContext('2d'), {
    type: 'bar',
    data: { labels: ['New','In Progress','Resolved','Closed','Reopened','Rejected','Deferred'], datasets: [{ label: 'Bugs', data: [stat.NEW,stat.IN_PROGRESS,stat.RESOLVED,stat.CLOSED,stat.REOPENED,stat.REJECTED||0,stat.DEFERRED||0], backgroundColor: ['#3b82f6','#f59e0b','#8b5cf6','#10b981','#ef4444','#6b7280','#4b5563'] }] },
    options: { responsive: true, scales: { x: { ticks: { color: '#fff', font: { size: 10 } } }, y: { ticks: { color: '#fff' }, beginAtZero: true } }, plugins: { legend: { display: false } } }
  });
}

function renderPerfStats(qa, dev) {
  const qb = document.getElementById('qaStatsBody');
  const db2 = document.getElementById('devStatsBody');
  qb.innerHTML = qa.length ? qa.map(q => `<tr><td>${q.full_name}</td><td><strong>${q.count}</strong></td></tr>`).join('') : '<tr><td colspan="2" style="color:var(--text-muted)">Chua co du lieu</td></tr>';
  db2.innerHTML = dev.length ? dev.map(d => `<tr><td>${d.full_name}</td><td><strong>${d.count}</strong></td></tr>`).join('') : '<tr><td colspan="2" style="color:var(--text-muted)">Chua co du lieu</td></tr>';
}

// ====== 2. PROJECTS ======
async function loadProjects() {
  try {
    const r = await fetch(`${API}/projects`);
    projects = await r.json();
    // Update filter selects
    const fp = document.getElementById('filterProject');
    if(fp) {
      fp.innerHTML = '<option value="">-- Tat ca Du an --</option>';
      projects.forEach(p => fp.innerHTML += `<option value="${p.project_id}">${p.project_key} - ${p.project_name}</option>`);
    }
    
    renderProjectsGrid();

    const btnCreateProj = document.getElementById('btnCreateProject');
    if (btnCreateProj) {
      btnCreateProj.style.display = currentUser.role === 'ADMIN' ? 'inline-block' : 'none';
    }

    // Populate PM select in create project modal
    const users = await (await fetch(`${API}/auth/users`)).json();
    const pmSel = document.getElementById('npPM');
    pmSel.innerHTML = '<option value="">-- Chon PM --</option>';
    users.forEach(u => pmSel.innerHTML += `<option value="${u.user_id}">${u.full_name} (${u.email})</option>`);
  } catch (e) { console.error(e); }
}

function renderProjectsGrid() {
  const g = document.getElementById('projectsGrid');
  g.innerHTML = '';
  projects.forEach(p => {
    const a = p.status === 'ARCHIVED';
    g.innerHTML += `
      <div class="glass-card" style="margin-bottom:0;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="badge ${a?'badge-trivial':'badge-status'}">${p.project_key}</span>
          <span class="badge ${a?'badge-critical':'badge-closed'}">${p.status}</span>
        </div>
        <h3 style="margin-top:8px;font-size:1rem;">${p.project_name}</h3>
        <p style="color:var(--text-muted);font-size:0.8rem;margin:6px 0;">${p.description||''}</p>
        <div style="font-size:0.75rem;color:#cbd5e1;margin-bottom:8px;">${p.members_count} Thanh vien | ${p.modules_count} Modules</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" onclick="viewProjectDetail(${p.project_id})">Chi tiet</button>
          <button class="btn btn-secondary btn-sm" onclick="showAddMemberModal(${p.project_id})">+ Thanh vien</button>
          <button class="btn btn-secondary btn-sm" onclick="showAddModuleModal(${p.project_id})">+ Module</button>
          <button class="btn ${a?'btn-success':'btn-danger'} btn-sm" style="flex:1;" onclick="archiveProject(${p.project_id},'${a?'ACTIVE':'ARCHIVED'}')">
            ${a?'Mo lai (Unarchive)':'Luu tru (Archive)'}
          </button>
        </div>
      </div>`;
  });
}

async function viewProjectDetail(pid) {
  const r = await fetch(`${API}/projects/${pid}`);
  const p = await r.json();
  document.getElementById('pdTitle').textContent = `${p.project_key} - ${p.project_name} [${p.status}]`;
  const mDiv = document.getElementById('pdMembers');
  mDiv.innerHTML = p.members.map(m => `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);">${m.user?.full_name || 'N/A'} - <span class="badge badge-status">${m.project_role}</span>
    <button class="btn btn-danger btn-sm" style="float:right;padding:2px 6px;font-size:0.7rem;" onclick="removeMember(${pid},${m.user_id})">Xoa</button></div>`).join('') || 'Chua co thanh vien';
  const moDiv = document.getElementById('pdModules');
  moDiv.innerHTML = p.modules.map(m => `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);">${m.module_name} <span style="color:var(--text-muted);font-size:0.75rem;">(Dev: ${m.default_assignee?.full_name || 'Chua gan'})</span>
    <button class="btn btn-danger btn-sm" style="float:right;padding:2px 6px;font-size:0.7rem;" onclick="deleteModule(${pid},${m.module_id})">Xoa</button></div>`).join('') || 'Chua co module';
  showModal('projectDetailModal');
}

async function archiveProject(pid, status) {
  if (currentUser.role !== 'PM' && currentUser.role !== 'ADMIN') { alert('Chi PM hoac Admin moi co quyen!'); return; }
  const r = await fetch(`${API}/projects/${pid}/archive`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({status}) });
  const d = await r.json();
  alert(d.message || d.error);
  loadProjects();
}

async function createProject(e) {
  e.preventDefault();
  const r = await fetch(`${API}/projects`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ project_key: document.getElementById('npKey').value, project_name: document.getElementById('npName').value, description: document.getElementById('npDesc').value, pm_id: document.getElementById('npPM').value || null }) });
  if (r.ok) { alert('Tao du an thanh cong!'); closeModal('createProjectModal'); loadProjects(); } else { const d = await r.json(); alert(d.error); }
}

async function showAddMemberModal(pid) {
  document.getElementById('amProjId').value = pid;
  const users = await (await fetch(`${API}/auth/users`)).json();
  const s = document.getElementById('amUser');
  s.innerHTML = users.map(u => `<option value="${u.user_id}">${u.full_name} (${u.email})</option>`).join('');
  showModal('addMemberModal');
}

async function addMember(e) {
  e.preventDefault();
  const pid = document.getElementById('amProjId').value;
  const r = await fetch(`${API}/projects/${pid}/members`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: document.getElementById('amUser').value, project_role: document.getElementById('amRole').value }) });
  const d = await r.json();
  alert(d.message || d.error);
  closeModal('addMemberModal');
  loadProjects();
}

async function removeMember(pid, uid) {
  if (!confirm('Xoa thanh vien nay khoi du an?')) return;
  await fetch(`${API}/projects/${pid}/members/${uid}`, { method: 'DELETE' });
  viewProjectDetail(pid);
  loadProjects();
}

async function showAddModuleModal(pid) {
  document.getElementById('cmProjId').value = pid;
  const users = await (await fetch(`${API}/auth/users`)).json();
  const s = document.getElementById('cmDev');
  s.innerHTML = '<option value="">-- Chua gan --</option>' + users.map(u => `<option value="${u.user_id}">${u.full_name}</option>`).join('');
  showModal('createModuleModal');
}

async function createModule(e) {
  e.preventDefault();
  const pid = document.getElementById('cmProjId').value;
  const r = await fetch(`${API}/projects/${pid}/modules`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ module_name: document.getElementById('cmName').value, description: document.getElementById('cmDesc').value, default_assignee_id: document.getElementById('cmDev').value || null }) });
  if (r.ok) { alert('Tao Module thanh cong!'); closeModal('createModuleModal'); loadProjects(); } else { const d = await r.json(); alert(d.error); }
}

async function deleteModule(pid, mid) {
  if (!confirm('Xoa module nay?')) return;
  await fetch(`${API}/projects/${pid}/modules/${mid}`, { method: 'DELETE' });
  viewProjectDetail(pid);
  loadProjects();
}

// ====== 3. ISSUES ======
async function loadIssues() {
  try {
    let url = `${API}/issues?user_id=${currentUser.user_id}&`;
    const pid = document.getElementById('filterProject').value;
    const st = document.getElementById('filterStatus').value;
    const sv = document.getElementById('filterSeverity').value;
    const srch = document.getElementById('searchInput').value;
    const my = document.getElementById('myIssuesOnly').checked;
    if (pid) url += `project_id=${pid}&`;
    if (st) url += `status=${st}&`;
    if (sv) url += `severity=${sv}&`;
    if (srch) url += `search=${encodeURIComponent(srch)}&`;
    if (my) url += `assignee_id=${currentUser.user_id}&`;
    const r = await fetch(url);
    issues = await r.json();
    renderIssuesTable();
  } catch (e) { console.error(e); }
}

function renderIssuesTable() {
  const tb = document.getElementById('issuesBody');
  if (!issues.length) { tb.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">Khong co ticket</td></tr>'; return; }
  tb.innerHTML = issues.map(i => {
    const sc = `badge-${i.severity.toLowerCase()}`;
    const stc = `badge-${i.status.toLowerCase()}`;
    return `<tr onclick="openIssue(${i.issue_id})">
      <td><strong>${i.issue_key}</strong></td>
      <td>${i.title}</td>
      <td>${i.module_name||'-'}</td>
      <td><span class="badge ${sc}">${i.severity}</span></td>
      <td><span class="badge ${stc}">${i.status}</span></td>
      <td style="color:#818cf8;font-weight:700;">${i.confidence_score}%</td>
      <td>${i.assignee_name||'N/A'}</td>
      <td><button class="btn btn-secondary btn-sm">Xem</button></td>
    </tr>`;
  }).join('');
}

// ====== 4. AUTO-TRIAGE & CREATE ISSUE ======
let triageTimer = null;

async function prepareCreateForm() {
  try {
    const url = currentUser.role === 'ADMIN' ? `${API}/projects` : `${API}/projects?user_id=${currentUser.user_id}`;
    const r = await fetch(url);
    const myProjects = await r.json();
    const cp = document.getElementById('cProjSelect');
    if(cp) {
      cp.innerHTML = '<option value="">-- Chon Du an --</option>' + myProjects.map(p => `<option value="${p.project_id}">${p.project_key} - ${p.project_name} ${p.status==='ARCHIVED'?'[Read-Only]':''}</option>`).join('');
    }
  } catch(e) { console.error(e); }
  onCreateProjectChange();
}

async function onCreateProjectChange() {
  const pid = document.getElementById('cProjSelect').value;
  if (!pid) return;
  const r = await fetch(`${API}/projects/${pid}`);
  const p = await r.json();
  document.getElementById('cModSelect').innerHTML = '<option value="">-- Chon Module --</option>' + p.modules.map(m => `<option value="${m.module_id}">${m.module_name}</option>`).join('');
  document.getElementById('cAssignee').innerHTML = '<option value="">-- Tu dong gan --</option>' + p.members.map(m => `<option value="${m.user_id}">${m.user?.full_name||'N/A'} (${m.project_role})</option>`).join('');
}

function triggerTriage() {
  clearTimeout(triageTimer);
  triageTimer = setTimeout(async () => {
    const title = document.getElementById('cTitle').value;
    const logs = document.getElementById('cLogs').value;
    const mid = document.getElementById('cModSelect').value;
    if (!title && !logs) return;
    try {
      const r = await fetch(`${API}/triage/analyze`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title, raw_logs: logs, module_id: mid}) });
      const d = await r.json();
      document.getElementById('cSeverity').value = d.suggested_severity;
      document.getElementById('cType').value = d.suggested_type;
      document.getElementById('cPriority').value = d.suggested_priority;
      document.getElementById('triageScore').textContent = d.confidence_score + '%';
      document.getElementById('triageReasons').innerHTML = d.reasons.join('<br>');
      if (d.suggested_assignee_id) document.getElementById('cAssignee').value = d.suggested_assignee_id;
    } catch (e) { console.error(e); }
  }, 350);
}

async function submitIssue(e) {
  e.preventDefault();
  const body = {
    project_id: document.getElementById('cProjSelect').value,
    module_id: document.getElementById('cModSelect').value || null,
    title: document.getElementById('cTitle').value,
    description: document.getElementById('cDesc').value,
    steps_to_reproduce: document.getElementById('cSteps').value,
    raw_logs: document.getElementById('cLogs').value,
    environment: document.getElementById('cEnv').value,
    severity: document.getElementById('cSeverity').value,
    issue_type: document.getElementById('cType').value,
    priority: document.getElementById('cPriority').value,
    assignee_id: document.getElementById('cAssignee').value || null,
    reporter_id: currentUser.user_id
  };
  const r = await fetch(`${API}/issues`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const d = await r.json();
  if (r.ok) { alert('Tao ticket thanh cong! Ma: ' + d.issue_key); document.getElementById('createForm').reset(); switchTab('issuesTab'); }
  else alert(d.error);
}

// ====== 5. ISSUE DETAIL MODAL ======
async function openIssue(id) {
  const r = await fetch(`${API}/issues/${id}`);
  activeIssue = await r.json();
  const i = activeIssue;
  document.getElementById('mKey').textContent = i.issue_key;
  document.getElementById('mTitle').textContent = i.title;
  document.getElementById('mDesc').textContent = i.description || 'Khong co mo ta.';
  document.getElementById('mSteps').textContent = i.steps_to_reproduce || 'Khong co buoc tai hien.';
  document.getElementById('mLogs').textContent = i.raw_logs || 'Khong co log.';
  document.getElementById('mStatus').innerHTML = `<span class="badge badge-${i.status.toLowerCase()}">${i.status}</span>`;
  document.getElementById('mSev').innerHTML = `<span class="badge badge-${i.severity.toLowerCase()}">${i.severity}</span>`;
  document.getElementById('mPri').textContent = i.priority;
  document.getElementById('mType').textContent = i.issue_type;
  document.getElementById('mEnv').textContent = i.environment;
  document.getElementById('mReporter').textContent = i.reporter_name;
  document.getElementById('mAssignee').textContent = i.assignee_name;
  document.getElementById('mGit').textContent = i.git_commit_ref || 'Chua co';
  document.getElementById('mSLA').textContent = i.sla_due_date ? new Date(i.sla_due_date).toLocaleString() : 'N/A';
  document.getElementById('mConf').textContent = i.confidence_score + '%';

  // Populate reassign select
  const users = await (await fetch(`${API}/auth/users`)).json();
  document.getElementById('mReassign').innerHTML = users.map(u => `<option value="${u.user_id}" ${u.user_id===i.assignee_id?'selected':''}>${u.full_name}</option>`).join('');
  document.getElementById('mPriority').value = i.priority;
  document.getElementById('mSeverity').value = i.severity;

  // Comments
  document.getElementById('mComments').innerHTML = (i.comments||[]).map(c => `<div style="background:rgba(255,255,255,0.05);padding:6px 10px;border-radius:6px;margin-bottom:4px;"><strong>${c.user_name}</strong> <small style="color:var(--text-muted);float:right;">${new Date(c.created_at).toLocaleTimeString()}</small><div>${c.content}</div></div>`).join('') || '<div style="color:var(--text-muted)">Chua co binh luan</div>';

  // Audit History
  document.getElementById('mHistory').innerHTML = (i.history||[]).map(h => `<div class="history-item"><span class="field">${h.field_name}</span>: ${h.old_value||'(none)'} &rarr; ${h.new_value||'(none)'} <span style="float:right;color:var(--text-muted);font-size:0.72rem;">${h.user_name} - ${new Date(h.created_at).toLocaleString()}</span></div>`).join('') || '<div style="color:var(--text-muted)">Chua co lich su</div>';

  // Check archived
  const isArchived = i.project_status === 'ARCHIVED';
  document.getElementById('mArchivedBadge').style.display = isArchived ? 'inline-block' : 'none';
  document.getElementById('triageControls').style.display = isArchived ? 'none' : 'block';
  document.getElementById('mCommentForm').style.display = isArchived ? 'none' : 'flex';

  renderWorkflowBtns(i.status, isArchived);
  showModal('issueModal');
}

function renderWorkflowBtns(status, isArchived) {
  const c = document.getElementById('workflowBtns');
  c.innerHTML = '';
  const role = currentUser.role;

  if (isArchived) { c.innerHTML = '<div style="color:var(--accent-warning);font-size:0.8rem;">Du an da Archive. Read-Only.</div>'; return; }

  if (status === 'NEW' || status === 'REOPENED') {
    if (role === 'DEV' || role === 'PM' || role === 'ADMIN')
      c.innerHTML += `<button class="btn" onclick="changeStatus('IN_PROGRESS')">Bat dau sua (IN_PROGRESS)</button>`;
    if (role === 'PM' || role === 'ADMIN') {
      c.innerHTML += `<button class="btn btn-danger btn-sm" onclick="changeStatus('REJECTED')">Tu choi (REJECTED)</button>`;
      c.innerHTML += `<button class="btn btn-secondary btn-sm" onclick="changeStatus('DUPLICATE')">Trung lap (DUPLICATE)</button>`;
      c.innerHTML += `<button class="btn btn-warning btn-sm" onclick="changeStatus('DEFERRED')">Hoan lai (DEFERRED)</button>`;
    }
  } else if (status === 'IN_PROGRESS') {
    if (role === 'DEV' || role === 'ADMIN')
      c.innerHTML += `<button class="btn btn-success" onclick="changeStatus('RESOLVED')">Da fix code (RESOLVED)</button>`;
  } else if (status === 'RESOLVED') {
    if (role === 'QA' || role === 'ADMIN') {
      c.innerHTML += `<button class="btn btn-success" onclick="changeStatus('CLOSED')">Re-test Dat - Dong (CLOSED)</button>`;
      c.innerHTML += `<button class="btn btn-danger" onclick="changeStatus('REOPENED')">Re-test Fail - Mo lai (REOPENED)</button>`;
    }
  } else if (status === 'CLOSED') {
    c.innerHTML = '<div style="color:var(--accent-success);font-size:0.8rem;">Ticket da duoc dong hoan tat.</div>';
  } else if (status === 'REJECTED' || status === 'DUPLICATE') {
    c.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;">Ticket da bi tu choi / trung lap.</div>';
  } else if (status === 'DEFERRED') {
    if (role === 'PM' || role === 'ADMIN')
      c.innerHTML += `<button class="btn" onclick="changeStatus('NEW')">Mo lai de xu ly (NEW)</button>`;
  }
}

async function changeStatus(newStatus) {
  let gitRef = null;
  if (newStatus === 'RESOLVED') {
    gitRef = prompt('Nhap Git Commit Hash / PR Link:', '');
    if (gitRef === null) return;
  }
  const r = await fetch(`${API}/issues/${activeIssue.issue_id}/status`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: newStatus, user_id: currentUser.user_id, git_commit_ref: gitRef }) });
  const d = await r.json();
  if (r.ok) { alert(d.message); openIssue(activeIssue.issue_id); loadIssues(); }
  else alert(d.error);
}

async function saveTriage() {
  if (currentUser.role !== 'PM' && currentUser.role !== 'DEV' && currentUser.role !== 'ADMIN') { alert('Khong co quyen!'); return; }
  const r = await fetch(`${API}/issues/${activeIssue.issue_id}/triage`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: currentUser.user_id, assignee_id: document.getElementById('mReassign').value, priority: document.getElementById('mPriority').value, severity: document.getElementById('mSeverity').value }) });
  const d = await r.json();
  if (r.ok) { alert(d.message); openIssue(activeIssue.issue_id); loadIssues(); }
  else alert(d.error);
}

async function postComment() {
  const input = document.getElementById('mCommentInput');
  const content = input.value.trim();
  if (!content) return;
  const r = await fetch(`${API}/issues/${activeIssue.issue_id}/comments`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: currentUser.user_id, content }) });
  if (r.ok) { input.value = ''; openIssue(activeIssue.issue_id); }
  else { const d = await r.json(); alert(d.error); }
}

// ====== 6. ADMIN ======
async function loadUsers() {
  if (currentUser.role !== 'ADMIN') return;
  const r = await fetch(`${API}/auth/users`);
  const users = await r.json();
  document.getElementById('usersBody').innerHTML = users.map(u => {
    const active = u.status === 'ACTIVE';
    return `<tr>
      <td>${u.user_id}</td><td><strong>${u.full_name}</strong></td><td>${u.email}</td>
      <td><span class="badge badge-status">${u.global_role}</span></td>
      <td><span class="badge ${active?'badge-closed':'badge-critical'}">${u.status}</span></td>
      <td><button class="btn ${active?'btn-danger':'btn-success'} btn-sm" onclick="toggleUser(${u.user_id},'${active?'INACTIVE':'ACTIVE'}')">${active?'Vo hieu hoa':'Kich hoat'}</button></td>
    </tr>`;
  }).join('');
}

async function toggleUser(uid, status) {
  await fetch(`${API}/auth/users/${uid}/status`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status}) });
  loadUsers();
}

async function createUser(e) {
  e.preventDefault();
  const r = await fetch(`${API}/auth/create_user`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ full_name: document.getElementById('nuName').value, email: document.getElementById('nuEmail').value, global_role: document.getElementById('nuRole').value }) });
  if (r.ok) { alert('Tao tai khoan thanh cong!'); closeModal('createUserModal'); loadUsers(); }
  else { const d = await r.json(); alert(d.error); }
}
