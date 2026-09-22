#include <stdio.h>
#include <stdlib.h>
#include <time.h>

typedef enum { RED, BLACK } Color;

typedef struct RBNode {
    int             key;
    Color           color;
    struct RBNode  *left;
    struct RBNode  *right;
    struct RBNode  *parent;
} RBNode;

typedef struct {
    RBNode *root;
    RBNode *nil;    /* 统一哨兵，代替所有空指针 */
} RBTree;

static RBNode *new_node(RBTree *t, int key)
{
    RBNode *n = (RBNode *)malloc(sizeof(RBNode));
    if (!n) { fprintf(stderr, "out of memory\n"); exit(1); }
    n->key    = key;
    n->color  = RED;               /* 新结点一律先染红 */
    n->left   = n->right = n->parent = t->nil;
    return n;
}

void rbt_init(RBTree *t)
{
    t->nil = (RBNode *)malloc(sizeof(RBNode));
    if (!t->nil) { fprintf(stderr, "out of memory\n"); exit(1); }
    t->nil->color  = BLACK;
    t->nil->left   = t->nil->right = t->nil->parent = NULL;
    t->root        = t->nil;
}

static void left_rotate(RBTree *t, RBNode *x)
{
    RBNode *y = x->right;

    x->right = y->left;
    if (y->left != t->nil)
        y->left->parent = x;

    y->parent = x->parent;
    if (x->parent == t->nil)
        t->root = y;
    else if (x == x->parent->left)
        x->parent->left = y;
    else
        x->parent->right = y;

    y->left   = x;
    x->parent = y;
}

static void right_rotate(RBTree *t, RBNode *y)
{
    RBNode *x = y->left;

    y->left = x->right;
    if (x->right != t->nil)
        x->right->parent = y;

    x->parent = y->parent;
    if (y->parent == t->nil)
        t->root = x;
    else if (y == y->parent->left)
        y->parent->left = x;
    else
        y->parent->right = x;

    x->right  = y;
    y->parent = x;
}

/* ---------------- 插入 ---------------- */

static void insert_fixup(RBTree *t, RBNode *z)
{
    /* 只要父结点是红色，就违反了性质 4，需要修复 */
    while (z->parent->color == RED) {

        if (z->parent == z->parent->parent->left) {
            RBNode *uncle = z->parent->parent->right;   /* 叔叔结点 */

            if (uncle->color == RED) {                  /* 情况 1：叔叔红 → 只变色 */
                z->parent->color         = BLACK;
                uncle->color             = BLACK;
                z->parent->parent->color = RED;
                z = z->parent->parent;                  /* 冲突上移，继续循环 */
            } else {
                if (z == z->parent->right) {            /* 情况 2：内侧 → 先左旋变成情况 3 */
                    z = z->parent;
                    left_rotate(t, z);
                }
                /* 情况 3：外侧 → 父变黑、祖父变红，绕祖父右旋 */
                z->parent->color         = BLACK;
                z->parent->parent->color = RED;
                right_rotate(t, z->parent->parent);
            }
        } else {
            /* 与上面完全对称 */
            RBNode *uncle = z->parent->parent->left;

            if (uncle->color == RED) {
                z->parent->color         = BLACK;
                uncle->color             = BLACK;
                z->parent->parent->color = RED;
                z = z->parent->parent;
            } else {
                if (z == z->parent->left) {
                    z = z->parent;
                    right_rotate(t, z);
                }
                z->parent->color         = BLACK;
                z->parent->parent->color = RED;
                left_rotate(t, z->parent->parent);
            }
        }
    }
    t->root->color = BLACK;   /* 性质 2 */
}

/* 返回 1 表示插入成功，0 表示键已存在 */
int rbt_insert(RBTree *t, int key)
{
    RBNode *parent = t->nil;
    RBNode *cur    = t->root;

    while (cur != t->nil) {              /* 普通 BST 查找插入位置 */
        parent = cur;
        if (key == cur->key) return 0;
        cur = (key < cur->key) ? cur->left : cur->right;
    }

    RBNode *z  = new_node(t, key);
    z->parent  = parent;

    if (parent == t->nil)      t->root = z;
    else if (key < parent->key) parent->left  = z;
    else                        parent->right = z;

    insert_fixup(t, z);
    return 1;
}

/* ---------------- 查找 / 最值 ---------------- */

RBNode *rbt_search(RBTree *t, int key)
{
    RBNode *cur = t->root;
    while (cur != t->nil && cur->key != key)
        cur = (key < cur->key) ? cur->left : cur->right;
    return cur;
}

static RBNode *subtree_min(RBTree *t, RBNode *x)
{
    while (x->left != t->nil) x = x->left;
    return x;
}

/* ---------------- 删除 ---------------- */

/* 用子树 v 替换子树 u（只改父子的指针，不处理 v 的孩子） */
static void transplant(RBTree *t, RBNode *u, RBNode *v)
{
    if (u->parent == t->nil)          t->root = v;
    else if (u == u->parent->left)    u->parent->left  = v;
    else                              u->parent->right = v;
    v->parent = u->parent;
}

/* x 携带一重"额外黑"，需要把黑高还给树 */
static void delete_fixup(RBTree *t, RBNode *x)
{
    while (x != t->root && x->color == BLACK) {

        if (x == x->parent->left) {
            RBNode *w = x->parent->right;              /* 兄弟 */

            if (w->color == RED) {                     /* 情况 1：兄弟红 */
                w->color         = BLACK;
                x->parent->color = RED;
                left_rotate(t, x->parent);
                w = x->parent->right;
            }
            if (w->left->color == BLACK && w->right->color == BLACK) {
                w->color = RED;                        /* 情况 2：兄弟两子皆黑 */
                x = x->parent;
            } else {
                if (w->right->color == BLACK) {        /* 情况 3：兄弟右子黑 */
                    w->left->color = BLACK;
                    w->color       = RED;
                    right_rotate(t, w);
                    w = x->parent->right;
                }
                /* 情况 4：兄弟右子红 —— 终结局面 */
                w->color         = x->parent->color;
                x->parent->color = BLACK;
                w->right->color  = BLACK;
                left_rotate(t, x->parent);
                x = t->root;                           /* 退出循环 */
            }
        } else {
            /* 与上面完全对称 */
            RBNode *w = x->parent->left;

            if (w->color == RED) {
                w->color         = BLACK;
                x->parent->color = RED;
                right_rotate(t, x->parent);
                w = x->parent->left;
            }
            if (w->right->color == BLACK && w->left->color == BLACK) {
                w->color = RED;
                x = x->parent;
            } else {
                if (w->left->color == BLACK) {
                    w->right->color = BLACK;
                    w->color        = RED;
                    left_rotate(t, w);
                    w = x->parent->left;
                }
                w->color         = x->parent->color;
                x->parent->color = BLACK;
                w->left->color   = BLACK;
                right_rotate(t, x->parent);
                x = t->root;
            }
        }
    }
    x->color = BLACK;   /* 若 x 是红(或哨兵)，直接补一层黑 */
}

int rbt_delete(RBTree *t, int key)
{
    RBNode *z = rbt_search(t, key);
    if (z == t->nil) return 0;

    RBNode *y         = z;
    RBNode *x;
    Color   y_color0  = y->color;      /* 记录被真正摘走结点的原色 */

    if (z->left == t->nil) {                       /* 情形 A：只有右孩子 */
        x = z->right;
        transplant(t, z, z->right);
    } else if (z->right == t->nil) {               /* 情形 B：只有左孩子 */
        x = z->left;
        transplant(t, z, z->left);
    } else {                                       /* 情形 C：两个孩子 */
        y        = subtree_min(t, z->right);       /* 用后继替换 */
        y_color0 = y->color;
        x        = y->right;

        if (y->parent == z) {
            x->parent = y;                         /* x 可能是哨兵，必须补父指针 */
        } else {
            transplant(t, y, y->right);
            y->right         = z->right;
            y->right->parent = y;
        }
        transplant(t, z, y);
        y->left         = z->left;
        y->left->parent = y;
        y->color        = z->color;                /* 继承 z 的颜色 */
    }

    free(z);

    if (y_color0 == BLACK)      /* 摘走的是黑结点 → 黑高失衡 */
        delete_fixup(t, x);

    return 1;
}

/* ---------------- 遍历 / 统计 / 释放 ---------------- */

static void inorder_rec(RBTree *t, RBNode *n, int *cnt)
{
    if (n == t->nil) return;
    inorder_rec(t, n->left, cnt);
    printf("%d[%c] ", n->key, n->color == RED ? 'R' : 'B');
    ++(*cnt);
    inorder_rec(t, n->right, cnt);
}

void rbt_inorder(RBTree *t)
{
    int cnt = 0;
    inorder_rec(t, t->root, &cnt);
    printf("\n(共 %d 个结点)\n", cnt);
}

static void print_rec(RBTree *t, RBNode *n, int depth, char side)
{
    if (n == t->nil) return;
    for (int i = 0; i < depth; ++i) printf("    ");
    if (depth > 0) printf("%c-- ", side);
    printf("%d[%c]\n", n->key, n->color == RED ? 'R' : 'B');
    print_rec(t, n->left,  depth + 1, 'L');
    print_rec(t, n->right, depth + 1, 'R');
}

void rbt_print(RBTree *t)
{
    if (t->root == t->nil) { printf("(空树)\n"); return; }
    printf("%d[%c]\n", t->root->key, t->root->color == RED ? 'R' : 'B');
    print_rec(t, t->root->left,  1, 'L');
    print_rec(t, t->root->right, 1, 'R');
}

/* 递归校验五条性质：返回 1 合法；*black_h 回传子树黑高 */
static int check_rec(RBTree *t, RBNode *n, int *black_h)
{
    if (n == t->nil) { *black_h = 1; return 1; }       /* NIL 算一个黑 */

    if (n->color == RED) {                              /* 性质 4 */
        if (n->left->color == RED || n->right->color == RED) return 0;
    }
    if (n->left  != t->nil && n->left->parent  != n) return 0;
    if (n->right != t->nil && n->right->parent != n) return 0;

    int lh, rh;
    if (!check_rec(t, n->left,  &lh)) return 0;
    if (!check_rec(t, n->right, &rh)) return 0;
    if (lh != rh) return 0;                             /* 性质 5 */

    *black_h = lh + (n->color == BLACK ? 1 : 0);
    return 1;
}

int rbt_validate(RBTree *t)
{
    if (t->nil->color != BLACK) return 0;               /* 性质 3 */
    if (t->root == t->nil)      return 1;
    if (t->root->color != BLACK) return 0;              /* 性质 2 */
    if (t->root->parent != t->nil) return 0;

    int h;
    return check_rec(t, t->root, &h);
}

static void destroy_rec(RBTree *t, RBNode *n)
{
    if (n == t->nil) return;
    destroy_rec(t, n->left);
    destroy_rec(t, n->right);
    free(n);
}

void rbt_destroy(RBTree *t)
{
    destroy_rec(t, t->root);
    free(t->nil);
    t->root = t->nil = NULL;
}

/* ---------------- 测试 ---------------- */

#define CHECK(cond, msg)                                            \
    do {                                                            \
        if (!(cond)) {                                              \
            fprintf(stderr, "[FAIL] %s (line %d)\n", msg, __LINE__); \
            exit(1);                                                \
        }                                                           \
    } while (0)

int main(void)
{
    /* ---------- 第一部分：小规模演示 ---------- */
    RBTree t;
    rbt_init(&t);

    int demo[] = { 41, 38, 31, 12, 19, 8, 60, 55, 90, 76,
                   4, 25, 33, 47, 52, 68, 72, 99, 1, 15 };
    int n = (int)(sizeof(demo) / sizeof(demo[0]));

    printf("===== 依次插入 =====\n");
    for (int i = 0; i < n; ++i) {
        rbt_insert(&t, demo[i]);
        CHECK(rbt_validate(&t), "插入后红黑性质被破坏");
    }

    printf("中序遍历：\n");
    rbt_inorder(&t);

    printf("\n树形结构：\n");
    rbt_print(&t);

    printf("\n===== 依次删除 =====\n");
    int del[] = { 41, 38, 31, 12, 19, 8, 60, 55, 90, 76 };
    for (int i = 0; i < 10; ++i) {
        CHECK(rbt_delete(&t, del[i]) == 1, "删除失败");
        CHECK(rbt_validate(&t), "删除后红黑性质被破坏");
        printf("删除 %-3d 后合法，剩余 ", del[i]);
        int c = 0; inorder_rec(&t, t->root, &c);
        printf("(共 %d 个)\n", c);
    }

    printf("\n删除后树形结构：\n");
    rbt_print(&t);
    rbt_destroy(&t);

    /* ---------- 第二部分：随机压力测试 ---------- */
    printf("\n===== 随机压力测试 =====\n");
    srand(20240922);

    const int N = 5000;
    int *keys = (int *)malloc(sizeof(int) * N);
    CHECK(keys != NULL, "malloc failed");
    for (int i = 0; i < N; ++i) keys[i] = i + 1;

    /* Fisher-Yates 洗牌 */
    for (int i = N - 1; i > 0; --i) {
        int j = rand() % (i + 1);
        int tmp = keys[i]; keys[i] = keys[j]; keys[j] = tmp;
    }

    rbt_init(&t);
    for (int i = 0; i < N; ++i)
        CHECK(rbt_insert(&t, keys[i]) == 1, "随机插入失败");
    CHECK(rbt_validate(&t), "大量插入后性质被破坏");
    printf("插入 %d 个随机键：性质校验通过\n", N);

    /* 重复插入应被拒绝 */
    CHECK(rbt_insert(&t, keys[0]) == 0, "重复键应返回 0");

    /* 随机删除一半 */
    for (int i = N - 1; i > 0; --i) {
        int j = rand() % (i + 1);
        int tmp = keys[i]; keys[i] = keys[j]; keys[j] = tmp;
    }
    for (int i = 0; i < N / 2; ++i) {
        CHECK(rbt_delete(&t, keys[i]) == 1, "随机删除失败");
        if (i % 500 == 0)
            CHECK(rbt_validate(&t), "删除过程中性质被破坏");
    }
    CHECK(rbt_validate(&t), "大量删除后性质被破坏");
    printf("删除 %d 个随机键：性质校验通过\n", N / 2);

    /* 剩下的键应仍能查到，删掉的应查不到 */
    int *alive = (int *)calloc(N + 1, sizeof(int));
    for (int i = N / 2; i < N; ++i) alive[keys[i]] = 1;

    for (int k = 1; k <= N; ++k) {
        RBNode *node = rbt_search(&t, k);
        if (alive[k]) CHECK(node != t.nil, "存活键查找失败");
        else          CHECK(node == t.nil, "已删键仍然存在");
    }
    printf("查找一致性校验通过\n");

    printf("最终剩余结点数 = %d（期望 %d）\n", (int)(N - N / 2), N / 2);

    free(alive);
    free(keys);
    rbt_destroy(&t);

    printf("\n全部测试通过 ✔\n");
    return 0;
}