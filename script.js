const treinoEl = document.getElementById("treino");
const dataEl = document.getElementById("data");
const exerciciosEl = document.getElementById("exercicios");
const registrarBtn = document.getElementById("registrar");
const mensagemEl = document.getElementById("mensagem");
const statusEl = document.getElementById("status");

let treinos = [];

function hojeLocal() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

dataEl.value = hojeLocal();

function showMessage(text, type = "") {
  mensagemEl.textContent = text;
  mensagemEl.className = `message ${type}`;
}

async function apiGet() {
  const response = await fetch(`${API_URL}?action=getTreinos`, { cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível consultar a planilha.");
  return response.json();
}

async function carregarTreinos() {
  if (!API_URL || API_URL.includes("COLE_AQUI")) {
    statusEl.textContent = "Configure a API";
    showMessage("Cole a URL do Apps Script no arquivo config.js.", "error");
    return;
  }

  try {
    const data = await apiGet();
    treinos = data.treinos || [];

    treinoEl.innerHTML = '<option value="">Selecione o treino</option>';
    treinos.forEach(t => {
      const option = document.createElement("option");
      option.value = t.nome;
      option.textContent = t.nome;
      treinoEl.appendChild(option);
    });

    statusEl.textContent = "Planilha conectada";
  } catch (error) {
    statusEl.textContent = "Erro de conexão";
    showMessage(error.message, "error");
  }
}

function renderExercicios(treino) {
  exerciciosEl.innerHTML = "";
  registrarBtn.disabled = true;

  if (!treino) {
    exerciciosEl.innerHTML = '<div class="empty">Selecione um treino para carregar os exercícios.</div>';
    return;
  }

  treino.exercicios.forEach((ex, index) => {
    const row = document.createElement("div");
    row.className = "exercise";
    row.dataset.index = index;

    row.innerHTML = `
      <div class="exercise-name">
        ${escapeHtml(ex.nome)}
        <div class="exercise-target">${escapeHtml(ex.reps)} reps • RIR ${escapeHtml(ex.rir)}</div>
      </div>

      <input class="carga" type="number" min="0" step="0.5" placeholder="Carga" inputmode="decimal">
      <input class="series" type="number" min="1" step="1" value="${ex.series}" placeholder="Séries" inputmode="numeric">
      <input class="repeticoes" type="text" placeholder="Reps">
      <input class="rir" type="text" placeholder="RIR">
    `;

    exerciciosEl.appendChild(row);
  });

  registrarBtn.disabled = false;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

treinoEl.addEventListener("change", () => {
  const treino = treinos.find(t => t.nome === treinoEl.value);
  renderExercicios(treino);
});

registrarBtn.addEventListener("click", async () => {
  const treino = treinos.find(t => t.nome === treinoEl.value);
  if (!treino) return;

  const rows = [...document.querySelectorAll(".exercise")];
  const registros = [];

  for (const row of rows) {
    const index = Number(row.dataset.index);
    const ex = treino.exercicios[index];
    const carga = row.querySelector(".carga").value.trim();
    const series = row.querySelector(".series").value.trim();
    const repeticoes = row.querySelector(".repeticoes").value.trim();
    const rir = row.querySelector(".rir").value.trim();

    if (!carga || !series || !repeticoes || !rir) {
      showMessage(`Preencha todos os campos de "${ex.nome}".`, "error");
      return;
    }

    registros.push({
      data: dataEl.value,
      treino: treino.nome,
      exercicio: ex.nome,
      carga,
      series,
      repeticoes,
      rir
    });
  }

  registrarBtn.disabled = true;
  registrarBtn.textContent = "Registrando...";
  showMessage("");

  try {
    // POST como form-urlencoded evita preflight CORS no Google Apps Script.
    const body = new URLSearchParams({
      action: "registrarTreino",
      payload: JSON.stringify(registros)
    });

    const response = await fetch(API_URL, {
      method: "POST",
      body
    });

    const result = await response.json();
    if (!result.ok) throw new Error(result.error || "Erro ao registrar.");

    showMessage(`${registros.length} exercícios registrados com sucesso.`, "success");

    document.querySelectorAll(".carga, .repeticoes, .rir").forEach(input => input.value = "");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    registrarBtn.disabled = false;
    registrarBtn.textContent = "Registrar treino";
  }
});

carregarTreinos();
