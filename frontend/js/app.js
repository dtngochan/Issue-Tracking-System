/* ============================================================
   ISSUE TRACKING & AUTO-TRIAGE SYSTEM (ITS)
   Vue 3 + Bootstrap 5.3 Core Controller
   ============================================================ */

const { createApp, ref, reactive, computed, onMounted, watch, nextTick } = Vue;

createApp({
  setup() {
    // ----------------- STATE -----------------
    const API = '/api';
    const theme = ref(localStorage.getItem('its_theme') || 'dark');
    const isLoggedIn = ref(false);
    const currentUser = ref(null);
    const activeTab = ref('dashboard');
    const viewMode = ref('table'); // 'table' or 'kanban'
    const loading = ref(false);

    // Toast state
    const toast = reactive({ show: false, message: '', type: 'info', timer: null });
    function showToast(message, type = 'info') {
      toast.message = message;
      toast.type = type;
      toast.show = true;
      clearTimeout(toast.timer);
      toast.timer = setTimeout(() => { toast.show = false; }, 3500);
    }

    // Role mapping for test users
    const roleMap = { 1: 'ADMIN', 2: 'PM', 3: 'DEV', 4: 'DEV', 5: 'QA', 6: 'QA' };

    // Login Form State
    const loginEmail = ref('admin@company.com');
    const demoAccounts = [
      { role: 'ADMIN', email: 'admin@company.com', name: 'Nguyễn Văn Admin', icon: 'bi-shield-lock' },
      { role: 'PM', email: 'pm@company.com', name: 'Trần Thị PM', icon: 'bi-kanban' },
      { role: 'QA Lead', email: 'qa.lead@company.com', name: 'Hoàng Văn QA', icon: 'bi-bug' },
      { role: 'Dev Backend', email: 'dev.backend@company.com', name: 'Lê Văn Backend', icon: 'bi-code-slash' },
      { role: 'Dev Frontend', email: 'dev.frontend@company.com', name: 'Phạm Thị Frontend', icon: 'bi-laptop' }
    ];

    // Data Collections
    const allUsers = ref([]);
    const projects = ref([]);
    const issues = ref([]);
    const dashboardData = ref(null);
    const activeIssue = ref(null);
    const activeProjectDetail = ref(null);

    // Filters for Issues
    const filterProject = ref('');
    const filterStatus = ref('');
    const filterSeverity = ref('');
    const searchQuery = ref('');
    const myIssuesOnly = ref(false);

    // Auto-Triage / Create Issue Form
    const createForm = reactive({
      project_id: '',
      module_id: '',
      title: '',
      description: '',
      steps_to_reproduce: '',
      raw_logs: '',
      environment: 'DEV',
      severity: 'MAJOR',
      issue_type: 'BUG',
      priority: 'MEDIUM',
      assignee_id: ''
    });

<<<<<<< HEAD
    const currentProjectModules = ref([]);
    const currentProjectMembers = ref([]);
    const triageResult = reactive({
      confidence_score: 0,
      suggested_severity: 'MAJOR',
      suggested_type: 'BUG',
      suggested_priority: 'MEDIUM',
      suggested_assignee_id: null,
      reasons: []
    });
    let triageTimer = null;
=======
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
>>>>>>> bbd2b81b6cb46ac570f6e547ca8e262dcd95eaa8

    // Project Create Form Modal
    const newProject = reactive({ project_key: '', project_name: '', description: '', pm_id: '' });
    const newMember = reactive({ project_id: null, user_id: '', project_role: 'DEV' });
    const newModule = reactive({ project_id: null, module_name: '', description: '', default_assignee_id: '' });
    const newUser = reactive({ full_name: '', email: '', global_role: 'USER' });

    // Issue Modal State
    const commentInput = ref('');
    const triageEdit = reactive({ assignee_id: '', priority: 'MEDIUM', severity: 'MAJOR' });

    // Charts references
    let sevChart = null;
    let statChart = null;

    // ----------------- LIFECYCLE -----------------
    onMounted(async () => {
      applyTheme(theme.value);
      checkSession();
      if (isLoggedIn.value) {
        await initAppData();
      }
    });

<<<<<<< HEAD
    function toggleTheme() {
      theme.value = theme.value === 'dark' ? 'light' : 'dark';
      localStorage.setItem('its_theme', theme.value);
      applyTheme(theme.value);
      if (activeTab.value === 'dashboard') {
        nextTick(renderCharts);
      }
=======
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
>>>>>>> bbd2b81b6cb46ac570f6e547ca8e262dcd95eaa8
    }

    function applyTheme(t) {
      document.documentElement.setAttribute('data-bs-theme', t);
    }

    // ----------------- AUTHENTICATION -----------------
    function checkSession() {
      const savedUser = localStorage.getItem('its_user');
      if (savedUser) {
        currentUser.value = JSON.parse(savedUser);
        isLoggedIn.value = true;
      }
    }

    async function handleLogin(customEmail = null) {
      const emailToUse = customEmail || loginEmail.value;
      if (!emailToUse) return;
      loading.value = true;
      try {
        const res = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailToUse })
        });
        const data = await res.json();
        if (res.ok) {
          const u = data.user;
          u.role = u.global_role === 'ADMIN' ? 'ADMIN' : (roleMap[u.user_id] || 'DEV');
          currentUser.value = u;
          localStorage.setItem('its_user', JSON.stringify(u));
          isLoggedIn.value = true;
          showToast(`Xin chào, ${u.full_name}! (${u.role})`, 'success');
          await initAppData();
        } else {
          showToast(data.error || 'Đăng nhập thất bại!', 'danger');
        }
      } catch (err) {
        showToast('Lỗi kết nối máy chủ API!', 'danger');
      } finally {
        loading.value = false;
      }
    }

    function handleLogout() {
      localStorage.removeItem('its_user');
      currentUser.value = null;
      isLoggedIn.value = false;
      showToast('Đã đăng xuất thành công.', 'info');
    }

    async function switchRoleQuick(email) {
      await handleLogin(email);
    }

    // ----------------- INIT & TAB ROUTING -----------------
    async function initAppData() {
      await Promise.all([loadUsers(), loadProjects(), loadIssues()]);
      if (activeTab.value === 'dashboard') {
        await loadDashboard();
      }
    }

    async function setTab(tabName) {
      activeTab.value = tabName;
      if (tabName === 'dashboard') {
        await loadDashboard();
      } else if (tabName === 'issues') {
        await loadIssues();
      } else if (tabName === 'triage') {
        await prepareCreateForm();
      } else if (tabName === 'projects') {
        await loadProjects();
      } else if (tabName === 'admin') {
        await loadUsers();
      }
    }

    // ----------------- USERS API -----------------
    async function loadUsers() {
      try {
        const res = await fetch(`${API}/auth/users`);
        allUsers.value = await res.json();
      } catch (e) {
        console.error('Lỗi tải danh sách người dùng:', e);
      }
    }

    async function handleCreateUser() {
      if (!newUser.full_name || !newUser.email) return;
      try {
        const res = await fetch(`${API}/auth/create_user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Tạo tài khoản thành công!', 'success');
          newUser.full_name = '';
          newUser.email = '';
          newUser.global_role = 'USER';
          closeBootstrapModal('createUserModal');
          loadUsers();
        } else {
          showToast(data.error || 'Lỗi khi tạo user', 'danger');
        }
      } catch (e) {
        showToast('Lỗi kết nối!', 'danger');
      }
    }

    async function toggleUserStatus(user) {
      const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      try {
        const res = await fetch(`${API}/auth/users/${user.user_id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
          user.status = newStatus;
          showToast(`Đã đổi trạng thái sang ${newStatus}`, 'info');
        }
      } catch (e) {
        showToast('Lỗi cập nhật trạng thái', 'danger');
      }
    }

    // ----------------- DASHBOARD -----------------
    async function loadDashboard() {
      try {
        const res = await fetch(`${API}/dashboard/summary`);
        dashboardData.value = await res.json();
        nextTick(renderCharts);
      } catch (e) {
        console.error('Lỗi tải dashboard:', e);
      }
    }

    function renderCharts() {
      if (!dashboardData.value) return;
      const isDark = theme.value === 'dark';
      const textColor = isDark ? '#94a3b8' : '#475569';
      const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

      const sev = dashboardData.value.severity_breakdown || {};
      const stat = dashboardData.value.status_breakdown || {};

      // Severity Doughnut Chart
      const sevCtx = document.getElementById('sevChartCanvas');
      if (sevCtx) {
        if (sevChart) sevChart.destroy();
        sevChart = new Chart(sevCtx, {
          type: 'doughnut',
          data: {
            labels: ['Critical', 'Major', 'Minor', 'Trivial'],
            datasets: [{
              data: [sev.CRITICAL || 0, sev.MAJOR || 0, sev.MINOR || 0, sev.TRIVIAL || 0],
              backgroundColor: ['#ef4444', '#f59e0b', '#38bdf8', '#94a3b8'],
              borderWidth: 2,
              borderColor: isDark ? '#1a1f2e' : '#ffffff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 11 } } }
            },
            cutout: '68%'
          }
        });
      }

      // Status Bar Chart
      const statCtx = document.getElementById('statChartCanvas');
      if (statCtx) {
        if (statChart) statChart.destroy();
        statChart = new Chart(statCtx, {
          type: 'bar',
          data: {
            labels: ['New', 'In Progress', 'Resolved', 'Closed', 'Reopened', 'Rejected', 'Deferred'],
            datasets: [{
              label: 'Số lượng Bugs',
              data: [
                stat.NEW || 0, stat.IN_PROGRESS || 0, stat.RESOLVED || 0,
                stat.CLOSED || 0, stat.REOPENED || 0, stat.REJECTED || 0, stat.DEFERRED || 0
              ],
              backgroundColor: ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#64748b', '#475569'],
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } },
              y: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 }, beginAtZero: true }
            }
          }
        });
      }
    }

    // ----------------- PROJECTS -----------------
    async function loadProjects() {
      try {
        const res = await fetch(`${API}/projects`);
        projects.value = await res.json();
      } catch (e) {
        console.error('Lỗi tải dự án:', e);
      }
    }

    async function viewProjectDetail(pid) {
      try {
        const res = await fetch(`${API}/projects/${pid}`);
        activeProjectDetail.value = await res.json();
        openBootstrapModal('projectDetailModal');
      } catch (e) {
        showToast('Lỗi tải chi tiết dự án', 'danger');
      }
    }

    async function handleCreateProject() {
      if (!newProject.project_key || !newProject.project_name) return;
      try {
        const res = await fetch(`${API}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProject)
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Tạo dự án thành công!', 'success');
          newProject.project_key = '';
          newProject.project_name = '';
          newProject.description = '';
          newProject.pm_id = '';
          closeBootstrapModal('createProjectModal');
          loadProjects();
        } else {
          showToast(data.error || 'Lỗi tạo dự án', 'danger');
        }
      } catch (e) {
        showToast('Lỗi kết nối!', 'danger');
      }
    }

    async function toggleArchiveProject(project) {
      const targetStatus = project.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
      try {
        const res = await fetch(`${API}/projects/${project.project_id}/archive`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetStatus })
        });
        const data = await res.json();
        if (res.ok) {
          project.status = targetStatus;
          showToast(data.message || `Dự án đã chuyển sang ${targetStatus}`, 'info');
        } else {
          showToast(data.error || 'Lỗi thao tác!', 'danger');
        }
      } catch (e) {
        showToast('Lỗi kết nối!', 'danger');
      }
    }

    function openAddMemberModal(pid) {
      newMember.project_id = pid;
      newMember.user_id = allUsers.value.length ? allUsers.value[0].user_id : '';
      newMember.project_role = 'DEV';
      openBootstrapModal('addMemberModal');
    }

    async function handleAddMember() {
      if (!newMember.user_id) return;
      try {
        const res = await fetch(`${API}/projects/${newMember.project_id}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMember)
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Thêm thành viên thành công!', 'success');
          closeBootstrapModal('addMemberModal');
          loadProjects();
          if (activeProjectDetail.value && activeProjectDetail.value.project_id === newMember.project_id) {
            viewProjectDetail(newMember.project_id);
          }
        } else {
          showToast(data.error || 'Lỗi thêm thành viên', 'danger');
        }
      } catch (e) {
        showToast('Lỗi kết nối!', 'danger');
      }
    }

    async function handleRemoveMember(pid, uid) {
      if (!confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi dự án?')) return;
      try {
        await fetch(`${API}/projects/${pid}/members/${uid}`, { method: 'DELETE' });
        showToast('Đã xóa thành viên khỏi dự án', 'info');
        viewProjectDetail(pid);
        loadProjects();
      } catch (e) {
        showToast('Lỗi khi xóa thành viên', 'danger');
      }
    }

    function openAddModuleModal(pid) {
      newModule.project_id = pid;
      newModule.module_name = '';
      newModule.description = '';
      newModule.default_assignee_id = '';
      openBootstrapModal('createModuleModal');
    }

    async function handleCreateModule() {
      if (!newModule.module_name) return;
      try {
        const res = await fetch(`${API}/projects/${newModule.project_id}/modules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newModule)
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Tạo module thành công!', 'success');
          closeBootstrapModal('createModuleModal');
          loadProjects();
          if (activeProjectDetail.value && activeProjectDetail.value.project_id === newModule.project_id) {
            viewProjectDetail(newModule.project_id);
          }
        } else {
          showToast(data.error || 'Lỗi tạo module', 'danger');
        }
      } catch (e) {
        showToast('Lỗi kết nối!', 'danger');
      }
    }

    async function handleDeleteModule(pid, mid) {
      if (!confirm('Bạn có chắc chắn muốn xóa module này?')) return;
      try {
        await fetch(`${API}/projects/${pid}/modules/${mid}`, { method: 'DELETE' });
        showToast('Đã xóa module', 'info');
        viewProjectDetail(pid);
        loadProjects();
      } catch (e) {
        showToast('Lỗi khi xóa module', 'danger');
      }
    }

    // ----------------- ISSUES & KANBAN -----------------
    async function loadIssues() {
      try {
        let url = `${API}/issues?`;
        if (filterProject.value) url += `project_id=${filterProject.value}&`;
        if (filterStatus.value) url += `status=${filterStatus.value}&`;
        if (filterSeverity.value) url += `severity=${filterSeverity.value}&`;
        if (searchQuery.value) url += `search=${encodeURIComponent(searchQuery.value)}&`;
        if (myIssuesOnly.value && currentUser.value) url += `assignee_id=${currentUser.value.user_id}&`;

        const res = await fetch(url);
        issues.value = await res.json();
      } catch (e) {
        console.error('Lỗi tải danh sách issues:', e);
      }
    }

    // Kanban columns grouping
    const kanbanColumns = [
      { id: 'NEW', title: 'Mới tạo (NEW)', color: '#3b82f6', icon: 'bi-plus-circle' },
      { id: 'IN_PROGRESS', title: 'Đang xử lý (IN_PROGRESS)', color: '#f59e0b', icon: 'bi-gear-wide-connected' },
      { id: 'RESOLVED', title: 'Đã Fix (RESOLVED)', color: '#8b5cf6', icon: 'bi-check2-circle' },
      { id: 'CLOSED', title: 'Đã Đóng (CLOSED)', color: '#10b981', icon: 'bi-shield-check' }
    ];

    function getIssuesByStatus(status) {
      return issues.value.filter(i => {
        if (status === 'NEW') return i.status === 'NEW' || i.status === 'REOPENED';
        return i.status === status;
      });
    }

    // ----------------- LIVE AUTO-TRIAGE -----------------
    async function prepareCreateForm() {
      if (projects.value.length > 0 && !createForm.project_id) {
        createForm.project_id = projects.value[0].project_id;
        await onProjectChangeInCreate();
      }
    }

    async function onProjectChangeInCreate() {
      const pid = createForm.project_id;
      if (!pid) return;
      try {
        const res = await fetch(`${API}/projects/${pid}`);
        const p = await res.json();
        currentProjectModules.value = p.modules || [];
        currentProjectMembers.value = p.members || [];
        if (currentProjectModules.value.length > 0) {
          createForm.module_id = currentProjectModules.value[0].module_id;
        }
        triggerTriage();
      } catch (e) {
        console.error('Lỗi load modules của project:', e);
      }
    }

    function triggerTriage() {
      clearTimeout(triageTimer);
      triageTimer = setTimeout(async () => {
        if (!createForm.title && !createForm.raw_logs) {
          triageResult.confidence_score = 0;
          triageResult.reasons = ['Nhập tiêu đề hoặc dán console log để hệ thống phân tích tự động...'];
          return;
        }
        try {
          const res = await fetch(`${API}/triage/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: createForm.title,
              raw_logs: createForm.raw_logs,
              module_id: createForm.module_id
            })
          });
          const d = await res.json();
          triageResult.confidence_score = d.confidence_score || 0;
          triageResult.suggested_severity = d.suggested_severity;
          triageResult.suggested_type = d.suggested_type;
          triageResult.suggested_priority = d.suggested_priority;
          triageResult.suggested_assignee_id = d.suggested_assignee_id;
          triageResult.reasons = d.reasons || [];

          // Auto update fields
          createForm.severity = d.suggested_severity;
          createForm.issue_type = d.suggested_type;
          createForm.priority = d.suggested_priority;
          if (d.suggested_assignee_id) {
            createForm.assignee_id = d.suggested_assignee_id;
          }
        } catch (e) {
          console.error('Lỗi Auto-Triage:', e);
        }
      }, 300);
    }

    // Quick Sample Logs for demoing Auto-Triage
    function fillSampleLog(type) {
      if (type === '500_payment') {
        createForm.title = 'Lỗi HTTP 500 khi xử lý thanh toán VNPay Gateway';
        createForm.raw_logs = `[ERROR] 2026-09-25 14:22:01,112 payment_service.py:145 - NullPointerException: VNPay secret key is missing in config!
HTTP/1.1 500 Internal Server Error
Traceback (most recent call last):
  File "/app/services/payment.py", line 145, in process_vnpay
    raise DatabaseConnectionError("Unable to acquire pooled connection for transaction log")
DatabaseConnectionError: Pool exhausted (max 20 reached).`;
      } else if (type === 'ui_css') {
        createForm.title = 'Vỡ giao diện nút bấm giỏ hàng trên mobile Safari';
        createForm.raw_logs = `[WARN] CSS flex-wrap layout overflow on viewport < 375px. Button truncated.`;
      } else if (type === 'slow_query') {
        createForm.title = 'Truy vấn danh mục sản phẩm chậm bất thường (> 5s)';
        createForm.raw_logs = `[WARN] TimeoutError: Slow SQL query execution time 5420ms on table \`products\`. Missing index on category_id.`;
      }
      triggerTriage();
    }

    async function handleCreateIssue() {
      if (!createForm.project_id || !createForm.title) {
        showToast('Vui lòng chọn Dự án và nhập Tiêu đề lỗi!', 'warning');
        return;
      }
      try {
        const payload = {
          ...createForm,
          reporter_id: currentUser.value ? currentUser.value.user_id : 1
        };
        const res = await fetch(`${API}/issues`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          showToast(`Đã tạo thành công ticket ${data.issue_key}!`, 'success');
          // Reset form
          createForm.title = '';
          createForm.description = '';
          createForm.steps_to_reproduce = '';
          createForm.raw_logs = '';
          triageResult.confidence_score = 0;
          setTab('issues');
        } else {
          showToast(data.error || 'Lỗi khi tạo ticket', 'danger');
        }
      } catch (e) {
        showToast('Lỗi kết nối!', 'danger');
      }
    }

    // ----------------- ISSUE DETAIL MODAL & WORKFLOW -----------------
    async function openIssue(id) {
      try {
        const res = await fetch(`${API}/issues/${id}`);
        activeIssue.value = await res.json();
        triageEdit.assignee_id = activeIssue.value.assignee_id || '';
        triageEdit.priority = activeIssue.value.priority || 'MEDIUM';
        triageEdit.severity = activeIssue.value.severity || 'MAJOR';
        commentInput.value = '';
        openBootstrapModal('issueDetailModal');
      } catch (e) {
        showToast('Lỗi tải chi tiết ticket', 'danger');
      }
    }

    async function handleSaveTriage() {
      if (!activeIssue.value) return;
      try {
        const res = await fetch(`${API}/issues/${activeIssue.value.issue_id}/triage`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser.value.user_id,
            assignee_id: triageEdit.assignee_id || null,
            priority: triageEdit.priority,
            severity: triageEdit.severity
          })
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Đã lưu thay đổi phân loại & gán Dev!', 'success');
          openIssue(activeIssue.value.issue_id);
          loadIssues();
        } else {
          showToast(data.error || 'Lỗi cập nhật', 'danger');
        }
      } catch (e) {
        showToast('Lỗi kết nối!', 'danger');
      }
    }

    async function handleChangeStatus(newStatus) {
      if (!activeIssue.value) return;
      let gitRef = null;
      if (newStatus === 'RESOLVED') {
        gitRef = prompt('Nhập mã Git Commit Hash hoặc PR Link (ví dụ: commit-7a9b2c):', '');
        if (gitRef === null) return;
      }

      try {
        const res = await fetch(`${API}/issues/${activeIssue.value.issue_id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            user_id: currentUser.value.user_id,
            git_commit_ref: gitRef
          })
        });
        const data = await res.json();
        if (res.ok) {
          showToast(data.message || `Đã chuyển sang trạng thái ${newStatus}`, 'success');
          openIssue(activeIssue.value.issue_id);
          loadIssues();
        } else {
          showToast(data.error || 'Không đủ quyền thực hiện thao tác này!', 'danger');
        }
      } catch (e) {
        showToast('Lỗi kết nối!', 'danger');
      }
    }

    async function handlePostComment() {
      const content = commentInput.value.trim();
      if (!content || !activeIssue.value) return;
      try {
        const res = await fetch(`${API}/issues/${activeIssue.value.issue_id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser.value.user_id,
            content
          })
        });
        if (res.ok) {
          commentInput.value = '';
          openIssue(activeIssue.value.issue_id);
        } else {
          const d = await res.json();
          showToast(d.error || 'Lỗi gửi bình luận', 'danger');
        }
      } catch (e) {
        showToast('Lỗi kết nối!', 'danger');
      }
    }

    // ----------------- BOOTSTRAP MODAL HELPERS -----------------
    function openBootstrapModal(modalId) {
      const el = document.getElementById(modalId);
      if (el) {
        let modal = bootstrap.Modal.getInstance(el);
        if (!modal) modal = new bootstrap.Modal(el);
        modal.show();
      }
    }

    function closeBootstrapModal(modalId) {
      const el = document.getElementById(modalId);
      if (el) {
        const modal = bootstrap.Modal.getInstance(el);
        if (modal) modal.hide();
      }
    }

    // ----------------- FORMATTING HELPERS -----------------
    function getSeverityBadge(sev) {
      if (!sev) return 'badge-sev-trivial';
      return `badge-sev-${sev.toLowerCase()}`;
    }

    function getStatusBadge(st) {
      if (!st) return 'badge-st-new';
      return `badge-st-${st.toLowerCase()}`;
    }

    function formatDate(dateStr) {
      if (!dateStr) return 'N/A';
      return new Date(dateStr).toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit',
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    }

    return {
      theme, toggleTheme,
      isLoggedIn, currentUser, demoAccounts, loginEmail, handleLogin, handleLogout, switchRoleQuick,
      activeTab, setTab, viewMode, loading, toast, showToast,
      allUsers, handleCreateUser, toggleUserStatus, newUser,
      dashboardData,
      projects, viewProjectDetail, activeProjectDetail, handleCreateProject, newProject,
      toggleArchiveProject, openAddMemberModal, handleAddMember, handleRemoveMember, newMember,
      openAddModuleModal, handleCreateModule, handleDeleteModule, newModule,
      issues, loadIssues, filterProject, filterStatus, filterSeverity, searchQuery, myIssuesOnly,
      kanbanColumns, getIssuesByStatus,
      createForm, currentProjectModules, currentProjectMembers, triageResult, triggerTriage,
      onProjectChangeInCreate, fillSampleLog, handleCreateIssue,
      activeIssue, openIssue, triageEdit, handleSaveTriage, handleChangeStatus,
      commentInput, handlePostComment,
      getSeverityBadge, getStatusBadge, formatDate
    };
  }
}).mount('#app');
