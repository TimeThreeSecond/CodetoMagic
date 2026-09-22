#include <stdio.h>
#include <limits.h>

#define V 6
#define INF INT_MAX

/* Adjacency matrix: -1 means no edge; zero-weight edges are allowed.
   Dijkstra requires nonnegative edge weights. */
int closest_vertex(const int distance[V], const int visited[V]) {
    int best = -1;
    for (int v = 0; v < V; ++v) {
        if (!visited[v] && distance[v] != INF &&
            (best == -1 || distance[v] < distance[best])) {
            best = v;
        }
    }
    return best;
}

void dijkstra(const int graph[V][V], int source,
              int distance[V], int parent[V]) {
    int visited[V] = {0};
    for (int v = 0; v < V; ++v) {
        distance[v] = INF;
        parent[v] = -1;
    }
    if (source < 0 || source >= V) return;
    distance[source] = 0;
    for (int step = 0; step < V; ++step) {
        int u = closest_vertex(distance, visited);
        if (u == -1) break;
        visited[u] = 1;
        for (int v = 0; v < V; ++v) {
            int weight = graph[u][v];
            /* INF is reserved; guard addition against signed overflow. */
            if (!visited[v] && weight >= 0 &&
                distance[u] <= INF - weight &&
                distance[u] + weight < distance[v]) {
                distance[v] = distance[u] + weight;
                parent[v] = u;
            }
        }
    }
}

void print_path(const int parent[V], int vertex) {
    int path[V];
    int count = 0;
    while (vertex != -1 && count < V) {
        path[count++] = vertex;
        vertex = parent[vertex];
    }
    for (int i = count - 1; i >= 0; --i) {
        printf("%d%s", path[i], i ? " -> " : "\n");
    }
}

int main(void) {
    const int graph[V][V] = {
        { 0, 7, 9,-1,-1,14},
        { 7, 0,10,15,-1,-1},
        { 9,10, 0,11,-1, 2},
        {-1,15,11, 0, 6,-1},
        {-1,-1,-1, 6, 0, 9},
        {14,-1, 2,-1, 9, 0}
    };
    int distance[V], parent[V];
    dijkstra(graph, 0, distance, parent);
    for (int v = 0; v < V; ++v) {
        if (distance[v] == INF) {
            printf("0 -> %d: unreachable\n", v);
        } else {
            printf("0 -> %d: distance = %d; path = ", v, distance[v]);
            print_path(parent, v);
        }
    }
    return 0;
}
