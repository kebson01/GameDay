
export function createPageUrl(pageName: string) {
    // Keep the original case to match route definitions
    return '/' + pageName.replace(/ /g, '-');
}