function sanitizeFileName(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-");
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];

  for (let index = 0; index < bytes.length; index += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + 0x8000)));
  }

  return btoa(chunks.join(""));
}

function getTableText(table: HTMLTableElement) {
  const getCells = (row: HTMLTableRowElement) =>
    Array.from(row.cells)
      .filter((cell) => !cell.hasAttribute("data-pdf-ignore"))
      .map((cell) => cell.textContent?.trim() || "");
  const headerRow = table.tHead?.rows[0];

  return {
    body: Array.from(table.tBodies[0]?.rows ?? []).map(getCells),
    headers: headerRow ? getCells(headerRow) : [],
  };
}

export async function exportTableToPdf(
  table: HTMLTableElement,
  title: string,
  fileName: string,
) {
  const [{ default: pdfMake }, fontResponse] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    fetch(`${import.meta.env.BASE_URL}fonts/Amiri-Regular.ttf`),
  ]);

  if (!fontResponse.ok) {
    throw new Error("تعذر تحميل الخط العربي لملف PDF.");
  }

  const { body, headers } = getTableText(table);
  const fontBase64 = arrayBufferToBase64(await fontResponse.arrayBuffer());
  const fontFileName = "Amiri-Regular.ttf";

  pdfMake.addVirtualFileSystem({ [fontFileName]: fontBase64 });
  pdfMake.addFonts({
    Amiri: {
      bold: fontFileName,
      bolditalics: fontFileName,
      italics: fontFileName,
      normal: fontFileName,
    },
  });

  const headerCells = [...headers].reverse().map((text) => ({
    bold: true,
    color: "#ffffff",
    fillColor: "#235d4e",
    text,
  }));
  const rows = body.map((row) => [...row].reverse());

  await pdfMake
    .createPdf({
      content: [
        {
          bold: true,
          fontSize: 18,
          margin: [0, 0, 0, 12],
          text: title,
        },
        {
          layout: "lightHorizontalLines",
          table: {
            body: [headerCells, ...rows],
            dontBreakRows: true,
            headerRows: 1,
            widths: headers.map(() => "*"),
          },
        },
      ],
      defaultStyle: {
        alignment: "right",
        font: "Amiri",
        fontSize: 9,
      },
      pageMargins: [30, 30, 30, 30],
      pageOrientation: "landscape",
      pageSize: "A4",
    })
    .download(sanitizeFileName(fileName));
}
