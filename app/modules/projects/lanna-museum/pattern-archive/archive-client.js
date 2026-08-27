export function formatPatternCapturedAt(
  pattern,
  options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  },
  fallbackToCreated = false,
  locale = "zh-CN",
) {
  const value =
    pattern?.captured_at || (fallbackToCreated ? pattern?.created_at : "");
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Bangkok",
    ...options,
  }).format(date);
}

function loadFallbackImage(blob) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      resolve({
        source: image,
        close: () => URL.revokeObjectURL(objectUrl),
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("图片解码失败"));
    };
    image.src = objectUrl;
  });
}

async function loadCanvasImage(url, label) {
  if (!url) {
    throw new Error(`缺少${label}`);
  }

  let response;
  try {
    response = await fetch(url, { mode: "cors", credentials: "omit" });
  } catch {
    throw new Error(`${label}无法读取，请重新上传后再试`);
  }

  if (!response.ok) {
    throw new Error(`${label}无法读取，请重新上传后再试`);
  }

  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) {
    throw new Error(`${label}不是有效图片`);
  }

  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(blob);
    return {
      source: bitmap,
      close: () => bitmap.close(),
    };
  }

  return loadFallbackImage(blob);
}

function getImageDimensions(image) {
  return {
    width: image.naturalWidth || image.videoWidth || image.width,
    height: image.naturalHeight || image.videoHeight || image.height,
  };
}

function drawImageCover(context, image, x, y, width, height) {
  const source = getImageDimensions(image);
  const scale = Math.max(width / source.width, height / source.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (source.width - sourceWidth) / 2;
  const sourceY = (source.height - sourceHeight) / 2;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

function fitText(context, text, maxWidth) {
  const value = String(text || "");
  if (context.measureText(value).width <= maxWidth) {
    return value;
  }

  let fitted = value;
  while (fitted.length > 1 && context.measureText(`${fitted}…`).width > maxWidth) {
    fitted = fitted.slice(0, -1);
  }
  return `${fitted}…`;
}

function wrapText(context, text, x, y, maxWidth, lineHeight, maxLines) {
  const characters = Array.from(String(text || ""));
  const lines = [];
  let current = "";

  characters.forEach((character) => {
    const next = `${current}${character}`;
    if (current && context.measureText(next).width > maxWidth) {
      lines.push(current);
      current = character;
    } else {
      current = next;
    }
  });

  if (current) {
    lines.push(current);
  }

  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    visibleLines[maxLines - 1] = fitText(
      context,
      `${visibleLines[maxLines - 1]}…`,
      maxWidth,
    );
  }

  visibleLines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
}

function drawBrandMark(context, x, y) {
  const dots = [
    ["#e34f7d", 0, 0],
    ["#ec7623", 14, 0],
    ["#4d9c54", 28, 0],
    ["#5c2683", 7, 13],
    ["#1e9fbd", 21, 13],
  ];

  dots.forEach(([color, offsetX, offsetY]) => {
    context.beginPath();
    context.fillStyle = color;
    context.arc(x + offsetX, y + offsetY, 7, 0, Math.PI * 2);
    context.fill();
  });
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.size < 10_000) {
        reject(new Error("纹样卡图片生成失败"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

const exportCopy = {
  zh: {
    detailImage: "纹样局部图片",
    contextImage: "完整文物或作品图片",
    unsupported: "当前浏览器无法生成纹样卡",
    anonymous: "匿名采集者",
    lannaMuseum: "兰纳民俗博物馆",
    otherSource: "其他来源",
    collector: "采集者 / COLLECTED BY",
    capturedAt: "采集于",
    untitled: "未命名纹样采集",
    noObservation: "尚未填写现场观察",
    footer1: "现场观察 · 来源信息 · 仍待了解 · 创意再表达",
    footer2: "WaytoAGI 发起 · CMI Community 清迈场",
    locale: "zh-CN",
  },
  th: {
    detailImage: "ภาพลวดลายระยะใกล้",
    contextImage: "ภาพวัตถุหรือผลงานทั้งหมด",
    unsupported: "เบราว์เซอร์นี้ไม่สามารถสร้างการ์ดลวดลายได้",
    anonymous: "ผู้เก็บไม่ระบุชื่อ",
    lannaMuseum: "พิพิธภัณฑ์พื้นถิ่นล้านนา",
    otherSource: "แหล่งอื่น",
    collector: "ผู้เก็บ / COLLECTED BY",
    capturedAt: "เก็บเมื่อ",
    untitled: "การเก็บลวดลายไม่มีชื่อ",
    noObservation: "ยังไม่ได้บันทึกสิ่งที่สังเกต ณ สถานที่จริง",
    footer1:
      "สิ่งที่สังเกต · ข้อมูลที่มา · สิ่งที่ยังต้องค้นคว้า · การตีความใหม่",
    footer2: "WaytoAGI ริเริ่ม · CMI Community เชียงใหม่",
    locale: "th-TH-u-ca-gregory",
  },
  en: {
    detailImage: "pattern close-up",
    contextImage: "complete object or work image",
    unsupported: "This browser cannot generate a pattern card",
    anonymous: "Anonymous collector",
    lannaMuseum: "Lanna Folklife Centre",
    otherSource: "Other source",
    collector: "COLLECTED BY",
    capturedAt: "Collected on",
    untitled: "Untitled pattern collection",
    noObservation: "No on-site observation provided",
    footer1: "OBSERVATION · SOURCE · STILL TO LEARN · REIMAGINED",
    footer2: "Initiated by WaytoAGI · CMI Community Chiang Mai",
    locale: "en-GB",
  },
};

export async function renderPatternCardPng(pattern, language = "zh") {
  const copy = exportCopy[language] || exportCopy.zh;
  const detailUrl = pattern.detail_image_urls?.[0];
  const contextUrl = pattern.context_image_urls?.[0];
  const [detailImage, contextImage] = await Promise.all([
    loadCanvasImage(detailUrl, copy.detailImage),
    loadCanvasImage(contextUrl, copy.contextImage),
  ]);

  try {
    await document.fonts?.ready;

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error(copy.unsupported);
    }

    const purple = "#5c2683";
    const purpleDeep = "#351149";
    const paper = "#fbf8f1";
    const muted = "#6c6070";
    const orange = "#ec7623";
    const collectorName = pattern.collector_name?.trim() || copy.anonymous;
    const capturedAt = formatPatternCapturedAt(pattern, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }, false, copy.locale);
    const museumLabel =
      pattern.museumLabel ||
      (pattern.museum === "fam"
        ? "FAM Fahlanna Art Museum"
        : pattern.museum === "lanna_folklife"
          ? copy.lannaMuseum
          : copy.otherSource);
    const tags = [
      ...(pattern.carrier_tags || []),
      ...(pattern.structure_tags || []),
      ...(pattern.material_tags || []),
    ].slice(0, 5);

    context.fillStyle = paper;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#bca7c4";
    context.lineWidth = 2;
    context.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

    drawBrandMark(context, 70, 70);
    context.fillStyle = purple;
    context.font = '700 20px "Noto Sans SC", sans-serif';
    context.fillText("CMI · LANNA PATTERN ARCHIVE", 122, 92);
    context.fillStyle = purpleDeep;
    context.font = '700 25px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.textAlign = "right";
    context.fillText(pattern.archive_number, 1010, 92);
    context.textAlign = "left";

    context.save();
    context.beginPath();
    context.rect(70, 135, 940, 690);
    context.clip();
    drawImageCover(context, detailImage.source, 70, 135, 940, 690);
    context.restore();

    context.fillStyle = paper;
    context.fillRect(744, 616, 242, 184);
    context.strokeStyle = purple;
    context.lineWidth = 3;
    context.strokeRect(744, 616, 242, 184);
    context.save();
    context.beginPath();
    context.rect(754, 626, 222, 164);
    context.clip();
    drawImageCover(context, contextImage.source, 754, 626, 222, 164);
    context.restore();

    context.fillStyle = orange;
    context.font = '700 18px "Noto Sans SC", sans-serif';
    context.fillText(museumLabel, 70, 872);

    context.fillStyle = purple;
    context.font = '700 20px "Noto Sans SC", sans-serif';
    context.fillText(`${copy.collector} · ${collectorName}`, 70, 910);
    if (capturedAt) {
      context.textAlign = "right";
      context.font = '600 17px "Noto Sans SC", sans-serif';
      context.fillText(`${copy.capturedAt} · ${capturedAt}`, 1010, 910);
      context.textAlign = "left";
    }

    context.fillStyle = purpleDeep;
    context.font = '700 42px "Noto Serif SC", serif';
    context.fillText(
      fitText(context, pattern.source_title || copy.untitled, 940),
      70,
      967,
    );

    let tagX = 70;
    const tagY = 1000;
    context.font = '600 16px "Noto Sans SC", sans-serif';
    tags.forEach((tag) => {
      const width = context.measureText(tag).width + 26;
      if (tagX + width > 1010) {
        return;
      }
      context.strokeStyle = "#bfa8c6";
      context.lineWidth = 2;
      context.strokeRect(tagX, tagY, width, 32);
      context.fillStyle = purple;
      context.fillText(tag, tagX + 13, tagY + 22);
      tagX += width + 10;
    });

    context.fillStyle = muted;
    context.font = '400 21px "Noto Sans SC", sans-serif';
    wrapText(
      context,
      pattern.observation || copy.noObservation,
      70,
      1080,
      940,
      36,
      4,
    );

    context.strokeStyle = "#cdbdd2";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(70, 1252);
    context.lineTo(1010, 1252);
    context.stroke();

    context.fillStyle = muted;
    context.font = '500 14px "Noto Sans SC", sans-serif';
    context.fillText(copy.footer1, 70, 1292);
    context.textAlign = "right";
    context.fillText(copy.footer2, 1010, 1292);
    context.textAlign = "left";

    return canvasToPngBlob(canvas);
  } finally {
    detailImage.close();
    contextImage.close();
  }
}
