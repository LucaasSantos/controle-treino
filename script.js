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

async function carregarTreinos() {
  if (!API_URL || API_URL.includes("COLE_AQUI")) {
    statusEl.textContent = "Configure a API";
    showMessage("Cole a URL do Apps Script no arquivo config.js.", "error");
    return;
  }

  try {
    statusEl.textContent = "Consultando planilha...";

    const response = await fetch(`${API_URL}?action=getTreinos&t=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "O Apps Script retornou um erro.");
    }

    treinos = Array.isArray(data.treinos) ? data.treinos : [];

    treinoEl.innerHTML = '<option value="">Selecione o treino</option>';

    treinos.forEach(t => {
      const option = document.createElement("option");
      option.value = t.nome;
      option.textContent = t.nome;
      treinoEl.appendChild(option);
    });

    if (treinos.length === 0) {
      statusEl.textContent = "Conectada • 0 treinos";
      showMessage(
        'A planilha respondeu, mas nenhum treino foi encontrado na aba "INÍCIO". Verifique o Apps Script e faça uma nova implantação.',
        "error"
      );
      return;
    }

    statusEl.textContent = `Planilha conectada • ${treinos.length} treinos`;
    showMessage("");
  } catch (error) {
    statusEl.textContent = "Erro de conexão";
    showMessage(`Não foi possível carregar os treinos: ${error.message}`, "error");
  }
}

function renderExercicios(treino) {
  exerciciosEl.innerHTML = "";
  registrarBtn.disabled = true;

  if (!treino) {
    exerciciosEl.innerHTML =
      '<div class="empty">Selecione um treino para carregar os exercícios.</div>';
    return;
  }

  treino.exercicios.forEach((ex, index) => {
    const row = document.createElement("div");
    row.className = "exercise";
    row.dataset.index = index;

    row.innerHTML = `
      <div class="exercise-name">
        ${escapeHtml(ex.nome)}
        <div class="exercise-target">
          ${escapeHtml(ex.series)} séries • ${escapeHtml(ex.reps)} reps • RIR ${escapeHtml(ex.rir)}
        </div>
      </div>

      <input class="carga" type="number" min="0" step="0.5" placeholder="Carga" inputmode="decimal">
      <input class="series" type="number" min="1" step="1" value="${escapeHtml(ex.series)}" placeholder="Séries" inputmode="numeric">
      <input class="repeticoes" type="text" placeholder="Reps">
      <input class="rir" type="text" placeholder="RIR">
    `;

    exerciciosEl.appendChild(row);
  });

  registrarBtn.disabled = treino.exercicios.length === 0;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
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
    const body = new URLSearchParams({
      action: "registrarTreino",
      payload: JSON.stringify(registros)
    });

    const response = await fetch(API_URL, {
      method: "POST",
      body
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error || "Erro ao registrar.");
    }

    showMessage(
      `${registros.length} exercícios registrados com sucesso.`,
      "success"
    );

    document.querySelectorAll(".carga, .repeticoes, .rir").forEach(input => {
      input.value = "";
    });
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    registrarBtn.disabled = false;
    registrarBtn.textContent = "Registrar treino";
  }
});

carregarTreinos();
