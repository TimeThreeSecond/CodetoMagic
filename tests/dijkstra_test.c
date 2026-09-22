#include <assert.h>
#define main example_main
#include "../examples/dijkstra.c"
#undef main
int main(void) {
    const int graph[V][V] = {
        {0,7,9,-1,-1,14},{7,0,10,15,-1,-1},
        {9,10,0,11,-1,2},{-1,15,11,0,6,-1},
        {-1,-1,-1,6,0,9},{14,-1,2,-1,9,0}
    };
    int d[V], p[V];
    const int expected[V] = {0,7,9,20,20,11};
    dijkstra(graph,0,d,p);
    for(int i=0;i<V;++i) assert(d[i]==expected[i]);
    assert(p[4]==5 && p[5]==2 && p[2]==0);
    int sparse[V][V];
    for(int i=0;i<V;++i) for(int j=0;j<V;++j) sparse[i][j]=-1;
    sparse[0][1]=0; sparse[1][2]=2; sparse[2][3]=INT_MAX-1;
    dijkstra(sparse,0,d,p);
    assert(d[1]==0 && d[2]==2 && d[3]==INF && d[5]==INF);
    dijkstra(sparse,-1,d,p);
    for(int i=0;i<V;++i) assert(d[i]==INF && p[i]==-1);
    return 0;
}
