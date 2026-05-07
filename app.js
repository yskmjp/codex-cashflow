const CONFIG = {
  simulation: {
    endAge: 90,
    retirementAge: 65,
    pensionStartAge: 65,
    annualReturnRate: 0.02,
    inflationRate: 0.01,
    salaryGrowthRate: 0.005,
    monthlySaving: 0,
  },
  livingCost: {
    adultBase: 18,
    additionalAdult: 10,
    firstChild: 7,
    additionalChild: 6,
    incomeAdjustments: [
      { max: 24.99, multiplier: 0.9 },
      { max: 40, multiplier: 1.0 },
      { max: 60, multiplier: 1.15 },
      { max: Infinity, multiplier: 1.3 },
    ],
  },
  childRules: {
    independenceAge: 22,
    siblingGapYears: 3,
  },
  pensionRules: {
    bands: [
      { max: 24.99, adult1: 10, adult2: 18 },
      { max: 40, adult1: 12, adult2: 20 },
      { max: 60, adult1: 14, adult2: 24 },
      { max: Infinity, adult1: 16, adult2: 28 },
    ],
    additionalAdult: 4,
  },
  eventTemplates: {
    buy_house: { label: "家を買う", age: 35, amount: 500 },
    college: { label: "大学費用", amountPerChild: 400 },
    buy_car: { label: "車を買う", age: 40, amount: 250 },
    reform_house: { label: "家をリフォームする", age: 50, amount: 200 },
    parent_care: { label: "親の介護費用", age: 60, amount: 300 },
  },
  thresholds: {
    warningAssets: 200,
  },
};

const DEFAULT_INPUT = {
  age: 35,
  adults: 1,
  children: 0,
  oldestChildAge: null,
  monthlyIncome: 35,
  monthlyExpense: 20,
  financialAssets: 300,
  monthlySaving: 0,
  retirementAge: 65,
  eventFlags: {
    buy_house: false,
    college: false,
    buy_car: false,
    reform_house: false,
    parent_care: false,
  },
};

const form = document.getElementById("plannerForm");
const resetButton = document.getElementById("resetButton");
const reviewButton = document.getElementById("reviewButton");
const saveImageButton = document.getElementById("saveImageButton");
const toggleDetailButton = document.getElementById("toggleDetailButton");
const detailPanel = document.getElementById("detailPanel");
const expenseHint = document.getElementById("expenseHint");
const oldestChildField = document.getElementById("oldestChildField");
const collegeEventLabel = document.getElementById("collegeEventLabel");

const formFields = {
  age: document.getElementById("age"),
  adults: document.getElementById("adults"),
  children: document.getElementById("children"),
  oldestChildAge: document.getElementById("oldestChildAge"),
  monthlyIncome: document.getElementById("monthlyIncome"),
  monthlyExpense: document.getElementById("monthlyExpense"),
  financialAssets: document.getElementById("financialAssets"),
  monthlySaving: document.getElementById("monthlySaving"),
  retirementAge: document.getElementById("retirementAge"),
  eventBuyHouse: document.getElementById("eventBuyHouse"),
  eventCollege: document.getElementById("eventCollege"),
  eventBuyCar: document.getElementById("eventBuyCar"),
  eventReformHouse: document.getElementById("eventReformHouse"),
  eventParentCare: document.getElementById("eventParentCare"),
};

const ui = {
  resultSubline: document.getElementById("resultSubline"),
  resultMeta: document.getElementById("resultMeta"),
  childcareCard: document.getElementById("childcareCard"),
  childcareLabel: document.getElementById("childcareLabel"),
  childcareComment: document.getElementById("childcareComment"),
  retirementCard: document.getElementById("retirementCard"),
  retirementLabel: document.getElementById("retirementLabel"),
  retirementComment: document.getElementById("retirementComment"),
  metricChildcareEnd: document.getElementById("metricChildcareEnd"),
  metricAge60: document.getElementById("metricAge60"),
  metricRetirementBalance: document.getElementById("metricRetirementBalance"),
  eventList: document.getElementById("eventList"),
  actionList: document.getElementById("actionList"),
  assumptionList: document.getElementById("assumptionList"),
  timelineHighlights: document.getElementById("timelineHighlights"),
  resultCard: document.getElementById("resultCard"),
};

let expenseAutoFilled = true;
let lastResult = null;

populateSelect(formFields.adults, 1, 9);
populateSelect(formFields.children, 0, 9);
populateSelect(formFields.oldestChildAge, 0, 22);

applyInput(DEFAULT_INPUT, true);
renderFromForm();

resetButton.addEventListener("click", () => {
  applyInput(DEFAULT_INPUT, true);
  renderFromForm();
});

reviewButton.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
  formFields.age.focus();
});

toggleDetailButton.addEventListener("click", () => {
  const hidden = detailPanel.classList.toggle("hidden");
  toggleDetailButton.textContent = hidden ? "詳細をみる" : "詳細を閉じる";
});

saveImageButton.addEventListener("click", () => {
  if (!lastResult) {
    return;
  }
  exportSummaryImage(lastResult);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderFromForm();
  document.querySelector(".result-band").scrollIntoView({ behavior: "smooth", block: "start" });
});

formFields.children.addEventListener("change", () => {
  syncChildControls();
  autoFillExpenseIfNeeded();
});

formFields.adults.addEventListener("change", autoFillExpenseIfNeeded);
formFields.monthlyIncome.addEventListener("input", autoFillExpenseIfNeeded);

formFields.monthlyExpense.addEventListener("input", () => {
  expenseAutoFilled = false;
  expenseHint.textContent = "入力した値を使います";
});

document.querySelectorAll("[data-step-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const field = formFields[button.dataset.stepTarget];
    const step = Number(button.dataset.step);
    const min = Number(field.min || -Infinity);
    const max = Number(field.max || Infinity);
    const next = clamp(Number(field.value || 0) + step, min, max);
    field.value = String(next);
    field.dispatchEvent(new Event("change", { bubbles: true }));
    if (field === formFields.monthlyExpense) {
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
});

function populateSelect(select, start, end) {
  for (let value = start; value <= end; value += 1) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = String(value);
    select.append(option);
  }
}

function applyInput(input, resetAutoFill) {
  if (resetAutoFill) {
    expenseAutoFilled = true;
    expenseHint.textContent = "おすすめ値を入力中です";
  }

  formFields.age.value = String(input.age);
  formFields.adults.value = String(input.adults);
  formFields.children.value = String(input.children);
  formFields.oldestChildAge.value = input.oldestChildAge == null ? "0" : String(input.oldestChildAge);
  formFields.monthlyIncome.value = String(input.monthlyIncome);
  formFields.monthlyExpense.value = String(input.monthlyExpense);
  formFields.financialAssets.value = String(input.financialAssets);
  formFields.monthlySaving.value = String(input.monthlySaving);
  formFields.retirementAge.value = String(input.retirementAge);
  formFields.eventBuyHouse.checked = input.eventFlags.buy_house;
  formFields.eventCollege.checked = input.eventFlags.college;
  formFields.eventBuyCar.checked = input.eventFlags.buy_car;
  formFields.eventReformHouse.checked = input.eventFlags.reform_house;
  formFields.eventParentCare.checked = input.eventFlags.parent_care;
  syncChildControls();
}

function syncChildControls() {
  const children = Number(formFields.children.value);
  const hasChildren = children > 0;
  oldestChildField.classList.toggle("hidden", !hasChildren);
  collegeEventLabel.classList.toggle("hidden", !hasChildren);
  if (!hasChildren) {
    formFields.eventCollege.checked = false;
  }
}

function autoFillExpenseIfNeeded() {
  if (!expenseAutoFilled) {
    return;
  }

  const input = readInput();
  const suggested = getSuggestedMonthlyExpense(input);
  formFields.monthlyExpense.value = String(suggested);
  expenseHint.textContent = "おすすめ値を入力中です";
}

function readInput() {
  const children = Number(formFields.children.value);
  const oldestChildAge = children > 0 ? Number(formFields.oldestChildAge.value) : null;

  return {
    age: Number(formFields.age.value),
    adults: Number(formFields.adults.value),
    children,
    oldestChildAge,
    monthlyIncome: Number(formFields.monthlyIncome.value),
    monthlyExpense: Number(formFields.monthlyExpense.value),
    financialAssets: Number(formFields.financialAssets.value),
    monthlySaving: Number(formFields.monthlySaving.value || 0),
    retirementAge: Number(formFields.retirementAge.value || CONFIG.simulation.retirementAge),
    eventFlags: {
      buy_house: formFields.eventBuyHouse.checked,
      college: formFields.eventCollege.checked,
      buy_car: formFields.eventBuyCar.checked,
      reform_house: formFields.eventReformHouse.checked,
      parent_care: formFields.eventParentCare.checked,
    },
  };
}

function validateInput(input) {
  if (input.age < 20 || input.age > 70) {
    throw new Error("年齢を入力してください");
  }
  if (input.adults < 1) {
    throw new Error("大人の人数を選んでください");
  }
  if (input.children > 0 && (input.oldestChildAge == null || input.oldestChildAge < 0)) {
    throw new Error("子どもがいる場合は一番上の子の年齢を選んでください");
  }
  if (input.monthlyIncome <= 0) {
    throw new Error("月収は0より大きい値を入れてください");
  }
  if (input.monthlyExpense <= 0) {
    throw new Error("生活費は0より大きい値を入れてください");
  }
}

function renderFromForm() {
  try {
    const input = readInput();
    validateInput(input);
    const result = simulate(input);
    lastResult = result;
    renderResult(result);
  } catch (error) {
    ui.childcareLabel.textContent = "入力確認";
    ui.childcareComment.textContent = error.message;
    ui.retirementLabel.textContent = "-";
    ui.retirementComment.textContent = "条件を整えると結果が表示されます。";
  }
}

function simulate(input) {
  const currentYearExpenses = estimateExpenseParts(input);
  const annualMonthlyIncome = input.monthlyIncome * 12;
  const annualMonthlyExpense = input.monthlyExpense * 12;
  const monthlySaving = input.monthlySaving;
  const pensionPerMonth = estimatePensionMonthly(input.monthlyIncome, input.adults);
  const eventEntries = buildEventEntries(input);
  const timeline = [];
  let assets = input.financialAssets;
  const finalChildAge = getYoungestChildAge(input);
  const childcareEndAge =
    input.children > 0 ? input.age + Math.max(0, CONFIG.childRules.independenceAge - finalChildAge) : input.age;

  for (let age = input.age; age <= CONFIG.simulation.endAge; age += 1) {
    const yearsFromNow = age - input.age;
    const inflationFactor = Math.pow(1 + CONFIG.simulation.inflationRate, yearsFromNow);
    const salaryFactor = Math.pow(1 + CONFIG.simulation.salaryGrowthRate, yearsFromNow);
    const childrenExpenseMonthly = getChildrenExpenseForAge(input, currentYearExpenses.childPerUnit, age);
    const annualExpense = (currentYearExpenses.adultMonthly + childrenExpenseMonthly) * 12 * inflationFactor;
    const annualIncome =
      age < input.retirementAge
        ? annualMonthlyIncome * salaryFactor + monthlySaving * 12
        : age >= CONFIG.simulation.pensionStartAge
          ? pensionPerMonth * 12
          : 0;
    const eventCost = eventEntries
      .filter((entry) => entry.age === age)
      .reduce((sum, entry) => sum + entry.amount, 0);
    assets = assets * (1 + CONFIG.simulation.annualReturnRate) + annualIncome - annualExpense - eventCost;

    timeline.push({
      age,
      assets,
      annualIncome,
      annualExpense,
      eventCost,
      monthlyRetirementBalance: pensionPerMonth - (annualExpense / 12),
    });
  }

  const childcareIndex = timeline.findIndex((row) => row.age >= childcareEndAge);
  const assetsAtChildcareEnd = timeline[Math.max(childcareIndex, 0)]?.assets ?? assets;
  const assetsAt60 = timeline.find((row) => row.age === 60)?.assets ?? timeline.at(-1).assets;
  const retirementRow = timeline.find((row) => row.age === CONFIG.simulation.pensionStartAge) ?? timeline.at(-1);
  const monthlyRetirementBalance = retirementRow.monthlyRetirementBalance;

  const childcareWorst = getMinimumAssets(timeline, input.age, childcareEndAge);
  const retirementWorst = getMinimumAssets(timeline, Math.max(childcareEndAge, CONFIG.simulation.pensionStartAge), CONFIG.simulation.endAge);

  const childcareStatus = classifyAssets(childcareWorst, input.financialAssets);
  const retirementStatus = classifyRetirement(retirementWorst, monthlyRetirementBalance);

  return {
    input,
    childcareEndAge,
    pensionPerMonth,
    eventEntries,
    timeline,
    summary: {
      childcare: buildStatusSummary("childcare", childcareStatus, input, childcareWorst),
      retirement: buildStatusSummary("retirement", retirementStatus, input, retirementWorst),
    },
    metrics: {
      assetsAtChildcareEnd,
      assetsAt60,
      monthlyRetirementBalance,
    },
    actions: buildActions(timeline, input),
  };
}

function estimateExpenseParts(input) {
  const adultRecommended = getAdultBaseExpense(input.adults);
  const childRecommended = getChildBaseExpense(input.children);
  const recommendedTotal = adultRecommended + childRecommended;
  const adultRatio = recommendedTotal > 0 ? adultRecommended / recommendedTotal : 1;
  const adultMonthly = input.monthlyExpense * adultRatio;
  const childMonthly = Math.max(0, input.monthlyExpense - adultMonthly);
  const childPerUnit = distributeChildExpense(input.children, childMonthly);
  return { adultMonthly, childPerUnit };
}

function distributeChildExpense(children, totalChildMonthly) {
  if (children <= 0) {
    return [];
  }

  const weights = [];
  for (let index = 0; index < children; index += 1) {
    weights.push(index === 0 ? CONFIG.livingCost.firstChild : CONFIG.livingCost.additionalChild);
  }
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => totalChildMonthly * (weight / totalWeight));
}

function getChildrenExpenseForAge(input, childPerUnit, age) {
  if (!input.children || input.oldestChildAge == null) {
    return 0;
  }

  let monthly = 0;
  for (let index = 0; index < input.children; index += 1) {
    const childAgeAtCurrent = Math.max(0, input.oldestChildAge - CONFIG.childRules.siblingGapYears * index);
    const childAgeAtTarget = childAgeAtCurrent + (age - input.age);
    if (childAgeAtTarget < CONFIG.childRules.independenceAge) {
      monthly += childPerUnit[index] || 0;
    }
  }
  return monthly;
}

function getSuggestedMonthlyExpense(input) {
  const base = getAdultBaseExpense(input.adults) + getChildBaseExpense(input.children);
  const adjustment = CONFIG.livingCost.incomeAdjustments.find((item) => input.monthlyIncome <= item.max);
  return round1(base * adjustment.multiplier);
}

function getAdultBaseExpense(adults) {
  if (adults <= 0) {
    return 0;
  }
  return CONFIG.livingCost.adultBase + Math.max(0, adults - 1) * CONFIG.livingCost.additionalAdult;
}

function getChildBaseExpense(children) {
  if (children <= 0) {
    return 0;
  }
  return CONFIG.livingCost.firstChild + Math.max(0, children - 1) * CONFIG.livingCost.additionalChild;
}

function getYoungestChildAge(input) {
  if (input.children <= 0 || input.oldestChildAge == null) {
    return 0;
  }
  return Math.max(0, input.oldestChildAge - CONFIG.childRules.siblingGapYears * (input.children - 1));
}

function estimatePensionMonthly(monthlyIncome, adults) {
  const band = CONFIG.pensionRules.bands.find((item) => monthlyIncome <= item.max);
  if (adults <= 1) {
    return band.adult1;
  }
  if (adults === 2) {
    return band.adult2;
  }
  return band.adult2 + (adults - 2) * CONFIG.pensionRules.additionalAdult;
}

function buildEventEntries(input) {
  const entries = [];
  if (input.eventFlags.buy_house) {
    const item = CONFIG.eventTemplates.buy_house;
    entries.push({ age: Math.max(input.age, item.age), amount: item.amount, label: item.label });
  }
  if (input.eventFlags.college && input.children > 0 && input.oldestChildAge != null) {
    const item = CONFIG.eventTemplates.college;
    for (let index = 0; index < input.children; index += 1) {
      const ageNow = Math.max(0, input.oldestChildAge - CONFIG.childRules.siblingGapYears * index);
      const eventAge = input.age + Math.max(0, 18 - ageNow);
      entries.push({ age: eventAge, amount: item.amountPerChild, label: item.label });
    }
  }
  if (input.eventFlags.buy_car) {
    const item = CONFIG.eventTemplates.buy_car;
    entries.push({ age: Math.max(input.age, item.age), amount: item.amount, label: item.label });
  }
  if (input.eventFlags.reform_house) {
    const item = CONFIG.eventTemplates.reform_house;
    entries.push({ age: Math.max(input.age, item.age), amount: item.amount, label: item.label });
  }
  if (input.eventFlags.parent_care) {
    const item = CONFIG.eventTemplates.parent_care;
    entries.push({ age: Math.max(input.age, item.age), amount: item.amount, label: item.label });
  }
  return entries.sort((left, right) => left.age - right.age);
}

function getMinimumAssets(timeline, startAge, endAge) {
  return timeline
    .filter((row) => row.age >= startAge && row.age <= endAge)
    .reduce((min, row) => Math.min(min, row.assets), Infinity);
}

function classifyAssets(minAssets, currentAssets) {
  if (minAssets >= CONFIG.thresholds.warningAssets) {
    return "good";
  }
  if (minAssets >= 0) {
    return "warn";
  }
  return "danger";
}

function classifyRetirement(minAssets, monthlyBalance) {
  if (minAssets >= CONFIG.thresholds.warningAssets && monthlyBalance >= 0) {
    return "good";
  }
  if (minAssets >= 0) {
    return "warn";
  }
  return "danger";
}

function buildStatusSummary(kind, status, input, minAssets) {
  const map = {
    childcare: {
      good: {
        label: "大丈夫そう",
        comment: "大学費用まで含めても今の前提なら持ちそうです。",
      },
      warn: {
        label: "やや注意",
        comment: "大きな支出が重なる時期は余裕が薄くなりそうです。",
      },
      danger: {
        label: "見直しが必要",
        comment: "子育て期のどこかで資産の減りが大きくなりそうです。",
      },
    },
    retirement: {
      good: {
        label: "大丈夫そう",
        comment: "年金開始後も大きな不足は出にくそうです。",
      },
      warn: {
        label: "やや不安",
        comment: "老後前後で資産の余裕が細くなりそうです。",
      },
      danger: {
        label: "要対策",
        comment: "老後前後で資産の減りが大きく、早めの見直しが必要です。",
      },
    },
  };
  return { status, minAssets, ...map[kind][status] };
}

function buildActions(timeline, input) {
  const scenarios = [
    {
      label: "生活費を月3万円下げる",
      shortLabel: "生活費 -3万",
      apply: (draft) => {
        draft.monthlyExpense = Math.max(1, draft.monthlyExpense - 3);
      },
    },
    {
      label: "積立を月3万円増やす",
      shortLabel: "積立 +3万",
      apply: (draft) => {
        draft.monthlySaving += 3;
      },
    },
    {
      label: "退職を2年遅らせる",
      shortLabel: "退職 +2年",
      apply: (draft) => {
        draft.retirementAge += 2;
      },
    },
  ];

  return scenarios.map((scenario) => {
    const draft = structuredClone(input);
    scenario.apply(draft);
    const simulated = simulateWithoutActions(draft);
    const baselineFinal = timeline.at(-1).assets;
    const delta = simulated.finalAssets - baselineFinal;
    const target =
      scenario.label === "生活費を月3万円下げる"
        ? "養育期の余裕が増えます"
        : scenario.label === "積立を月3万円増やす"
          ? "老後資金の不足を減らせます"
          : "老後の資産減少を抑えられます";
    return {
      short: scenario.shortLabel,
      detail: `${scenario.label}と、${Math.abs(round1(delta))}万円ぶん改善しそうです。${target}`,
    };
  });
}

function simulateWithoutActions(input) {
  const eventEntries = buildEventEntries(input);
  const expenseParts = estimateExpenseParts(input);
  const pensionPerMonth = estimatePensionMonthly(input.monthlyIncome, input.adults);
  let assets = input.financialAssets;

  for (let age = input.age; age <= CONFIG.simulation.endAge; age += 1) {
    const yearsFromNow = age - input.age;
    const inflationFactor = Math.pow(1 + CONFIG.simulation.inflationRate, yearsFromNow);
    const salaryFactor = Math.pow(1 + CONFIG.simulation.salaryGrowthRate, yearsFromNow);
    const childrenExpenseMonthly = getChildrenExpenseForAge(input, expenseParts.childPerUnit, age);
    const annualExpense = (expenseParts.adultMonthly + childrenExpenseMonthly) * 12 * inflationFactor;
    const annualIncome =
      age < input.retirementAge
        ? input.monthlyIncome * 12 * salaryFactor + input.monthlySaving * 12
        : age >= CONFIG.simulation.pensionStartAge
          ? pensionPerMonth * 12
          : 0;
    const eventCost = eventEntries
      .filter((entry) => entry.age === age)
      .reduce((sum, entry) => sum + entry.amount, 0);
    assets = assets * (1 + CONFIG.simulation.annualReturnRate) + annualIncome - annualExpense - eventCost;
  }

  return { finalAssets: assets };
}

function renderResult(result) {
  ui.resultMeta.textContent = `${result.input.age}歳 / 大人${result.input.adults}人 / 子ども${result.input.children}人`;
  ui.resultSubline.textContent = "子育て期と老後のお金の見通しをまとめました";

  renderJudgeCard(ui.childcareCard, ui.childcareLabel, ui.childcareComment, result.summary.childcare);
  renderJudgeCard(ui.retirementCard, ui.retirementLabel, ui.retirementComment, result.summary.retirement);

  ui.metricChildcareEnd.textContent = `${formatAmount(result.metrics.assetsAtChildcareEnd)}万円`;
  ui.metricAge60.textContent = `${formatAmount(result.metrics.assetsAt60)}万円`;
  ui.metricRetirementBalance.textContent = `${result.metrics.monthlyRetirementBalance >= 0 ? "+" : ""}${formatSignedAmount(result.metrics.monthlyRetirementBalance)}万円`;
  ui.metricRetirementBalance.classList.toggle("negative", result.metrics.monthlyRetirementBalance < 0);

  renderList(
    ui.eventList,
    result.eventEntries.length
      ? result.eventEntries.slice(0, 2).map((entry) => `${entry.age}歳 ${entry.label}`)
      : ["イベントなし"]
  );

  renderList(ui.actionList, result.actions.map((item) => item.short));
  renderList(ui.assumptionList, [
    `終了年齢は${CONFIG.simulation.endAge}歳、退職は${result.input.retirementAge}歳前提です`,
    `資産の運用利回りは年${Math.round(CONFIG.simulation.annualReturnRate * 100)}%、物価上昇は年${Math.round(CONFIG.simulation.inflationRate * 100)}%で見ています`,
    `月収は退職まで年${(CONFIG.simulation.salaryGrowthRate * 100).toFixed(1)}%ずつ伸びる前提です`,
    `年金は${CONFIG.simulation.pensionStartAge}歳から、現在の月収と大人の人数から簡易推定しています`,
    `生活費は、大人${result.input.adults}人・子ども${result.input.children}人のおすすめ値を基準に、入力値を優先して使います`,
    `子どもの生活費加算は22歳まで、兄弟姉妹は${CONFIG.childRules.siblingGapYears}歳差で仮置きしています`,
    `大学費用は一番上の子が18歳になる年を基準に、子ども1人あたり${CONFIG.eventTemplates.college.amountPerChild}万円で計上します`,
    `家・車・リフォーム・介護のイベントは、チェックした標準金額と標準年齢で計上します`,
  ]);
  renderList(
    ui.timelineHighlights,
    [
      `養育期はおおよそ${result.childcareEndAge}歳までとして見ています`,
      `老後資金は、年金の想定月額${formatAmount(result.pensionPerMonth)}万円を含めて判定しています`,
      ...result.actions.map((item) => item.detail),
      `最終年齢${CONFIG.simulation.endAge}歳時点の資産は${formatAmount(result.timeline.at(-1).assets)}万円です`,
    ]
  );
}

function renderJudgeCard(card, labelNode, commentNode, summary) {
  card.classList.remove("status-good", "status-warn", "status-danger");
  card.classList.add(`status-${summary.status}`);
  labelNode.textContent = summary.label;
  commentNode.textContent = summary.comment;
}

function renderList(node, items) {
  node.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    node.append(li);
  });
}

function formatAmount(value) {
  return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(Math.round(value));
}

function formatSignedAmount(value) {
  return new Intl.NumberFormat("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function exportSummaryImage(result) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1700;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1700);
  gradient.addColorStop(0, "#f4ede1");
  gradient.addColorStop(1, "#f8f4eb");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#0f766e";
  ctx.font = "700 26px 'Zen Kaku Gothic New', sans-serif";
  ctx.fillText("Cashflow Snapshot", 82, 96);

  ctx.fillStyle = "#1d2430";
  ctx.font = "600 64px Fraunces, serif";
  ctx.fillText("かんたんライフプラン診断", 82, 168);

  ctx.fillStyle = "#5f6874";
  ctx.font = "500 28px 'Zen Kaku Gothic New', sans-serif";
  ctx.fillText(`${result.input.age}歳 / 大人${result.input.adults}人 / 子ども${result.input.children}人`, 82, 220);

  drawStatusCard(ctx, 82, 280, 916, 240, "子どもの養育費", result.summary.childcare);
  drawStatusCard(ctx, 82, 548, 916, 240, "老後の資金", result.summary.retirement);

  drawMetricBox(ctx, 82, 824, 916, 252, [
    ["養育期終了時点の資産", `${formatAmount(result.metrics.assetsAtChildcareEnd)}万円`],
    ["60歳時点の資産", `${formatAmount(result.metrics.assetsAt60)}万円`],
    ["老後の毎月収支", `${result.metrics.monthlyRetirementBalance >= 0 ? "+" : ""}${formatSignedAmount(result.metrics.monthlyRetirementBalance)}万円`],
  ]);

  drawListBox(ctx, 82, 1106, 916, 212, "主なイベント", result.eventEntries.length ? result.eventEntries.slice(0, 3).map((entry) => `${entry.age}歳 ${entry.label}`) : ["大きな支出イベントは設定されていません"]);
  drawListBox(ctx, 82, 1344, 916, 250, "改善アクション", result.actions.slice(0, 3).map((item) => item.short), true);

  ctx.fillStyle = "#6c7480";
  ctx.font = "500 22px 'Zen Kaku Gothic New', sans-serif";
  ctx.fillText("この結果は簡易診断です。実際の条件で変わる場合があります。", 82, 1644);

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `cashflow-summary-${Date.now()}.png`;
  link.click();
}

function drawStatusCard(ctx, x, y, width, height, title, summary) {
  const colors = {
    good: { bg: "#def5e9", fg: "#1d7a57" },
    warn: { bg: "#fff0d8", fg: "#b46906" },
    danger: { bg: "#ffe5db", fg: "#b04a1a" },
  };
  const palette = colors[summary.status];
  roundRect(ctx, x, y, width, height, 30, palette.bg);
  ctx.fillStyle = "#21303c";
  ctx.font = "700 28px 'Zen Kaku Gothic New', sans-serif";
  ctx.fillText(title, x + 36, y + 60);
  ctx.fillStyle = palette.fg;
  ctx.font = "700 54px 'Zen Kaku Gothic New', sans-serif";
  ctx.fillText(summary.label, x + 36, y + 132);
  ctx.fillStyle = "#37414f";
  ctx.font = "500 26px 'Zen Kaku Gothic New', sans-serif";
  wrapText(ctx, summary.comment, x + 36, y + 182, width - 72, 38);
}

function drawMetricBox(ctx, x, y, width, height, rows) {
  roundRect(ctx, x, y, width, height, 30, "#fffdf8");
  ctx.strokeStyle = "#d8d0c3";
  ctx.strokeRect(x, y, width, height);
  rows.forEach((row, index) => {
    const rowY = y + 62 + index * 72;
    ctx.fillStyle = "#5f6874";
    ctx.font = "500 24px 'Zen Kaku Gothic New', sans-serif";
    ctx.fillText(row[0], x + 32, rowY);
    ctx.fillStyle = row[1].includes("-") ? "#c2410c" : "#1d2430";
    ctx.font = "700 34px 'Zen Kaku Gothic New', sans-serif";
    ctx.fillText(row[1], x + 560, rowY);
  });
}

function drawListBox(ctx, x, y, width, height, title, items, compact) {
  roundRect(ctx, x, y, width, height, 30, "#fffdf8");
  ctx.strokeStyle = "#d8d0c3";
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = "#0f766e";
  ctx.font = "700 22px 'Zen Kaku Gothic New', sans-serif";
  ctx.fillText(title, x + 32, y + 48);
  ctx.fillStyle = "#36404d";
  ctx.font = compact ? "500 22px 'Zen Kaku Gothic New', sans-serif" : "500 24px 'Zen Kaku Gothic New', sans-serif";
  items.forEach((item, index) => {
    wrapText(ctx, `・${item}`, x + 32, y + 98 + index * (compact ? 52 : 44), width - 64, compact ? 30 : 32);
  });
}

function roundRect(ctx, x, y, width, height, radius, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.fill();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = [...text];
  let line = "";
  let cursorY = y;
  chars.forEach((char) => {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = char;
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  });
  if (line) {
    ctx.fillText(line, x, cursorY);
  }
}
