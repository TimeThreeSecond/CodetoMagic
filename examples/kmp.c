#include <stdio.h>
#include <string.h>
#include <stdlib.h>

void build_next(const char *pat, int *next)
{
    int m = (int)strlen(pat);
    next[0] = -1;
    int i = 0, j = -1;

    while (i < m - 1) {
        if (j == -1 || pat[i] == pat[j]) {
            i++;
            j++;
            next[i] = (pat[i] == pat[j]) ? next[j] : j;
        } else {
            j = next[j];
        }
    }
}

int kmp_search(const char *text, const char *pat, int *next)
{
    int n = (int)strlen(text);
    int m = (int)strlen(pat);
    int i = 0, j = 0;

    while (i < n && j < m) {
        if (j == -1 || text[i] == pat[j]) {
            i++;
            j++;
        } else {
            j = next[j];
        }
    }

    return (j == m) ? i - m : -1;
}

void print_next(const char *pat, const int *next)
{
    int m = (int)strlen(pat);
    printf("模式串 : ");
    for (int i = 0; i < m; i++) printf("%3c", pat[i]);
    printf("\nnext   : ");
    for (int i = 0; i < m; i++) printf("%3d", next[i]);
    printf("\n\n");
}

int main(void)
{
    struct { const char *text; const char *pat; } cases[] = {
        { "ABABABCABABABCABABABC", "ABABABC" },
        { "BBC ABCDAB ABCDABCDABDE", "ABCDABD" },
        { "aaaaaabaaaaaabaaaaaab", "aaaab" },
        { "hello world", "world" },
        { "hello world", "xyz" },
        { "abc", "abc" },
        { "abc", "abcd" },
    };

    int total = (int)(sizeof(cases) / sizeof(cases[0]));

    for (int k = 0; k < total; k++) {
        const char *text = cases[k].text;
        const char *pat  = cases[k].pat;
        int m = (int)strlen(pat);

        int *next = (int *)malloc(sizeof(int) * m);
        build_next(pat, next);

        printf("========================================\n");
        printf("文本串 : %s\n", text);
        printf("模式串 : %s\n\n", pat);
        print_next(pat, next);

        int pos = kmp_search(text, pat, next);

        if (pos >= 0)
            printf("匹配成功，首次出现位置 = %d\n", pos);
        else
            printf("匹配失败，未找到模式串\n");

        printf("\n");

        free(next);
    }

    return 0;
}