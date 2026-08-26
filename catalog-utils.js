export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function subsectionAnchorId(section, subsection, subsectionIndex) {
  return subsection.id || `${section.id}-group-${subsectionIndex + 1}`;
}

export function itemAnchorId(section, subsection, item, itemIndex, subsectionIndex) {
  const subsectionId = subsectionAnchorId(section, subsection, subsectionIndex);
  const itemId = slugify(item.name) || `item-${itemIndex + 1}`;
  return `${subsectionId}-${itemId}`;
}

export function collectCatalogItems(data) {
  return (data.sections || []).flatMap((section) =>
    (section.subsections || []).flatMap((subsection) => subsection.items || [])
  );
}
