package main

import (
	"debug/elf"
	"debug/gosym"
	"fmt"
	"os"
	"sort"
	"strconv"
)

func main() {
	f, _ := elf.Open(os.Args[1])
	defer f.Close()
	pcln, _ := f.Section(".gopclntab").Data()
	tab, _ := gosym.NewTable(nil, gosym.NewLineTable(pcln, f.Section(".text").Addr))
	lo, _ := strconv.ParseUint(os.Args[2], 0, 64)
	hi, _ := strconv.ParseUint(os.Args[3], 0, 64)
	var fns []*gosym.Func
	for i := range tab.Funcs {
		fn := &tab.Funcs[i]
		if fn.Entry >= lo && fn.Entry < hi {
			fns = append(fns, fn)
		}
	}
	sort.Slice(fns, func(i, j int) bool { return fns[i].Entry < fns[j].Entry })
	for _, fn := range fns {
		fmt.Printf("%#x-%#x %s\n", fn.Entry, fn.End, fn.Name)
	}
}
