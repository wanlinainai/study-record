package split

import "testing"

// 测试函数必须以Test开头，必须接收一个*testing.T类型的参数
// func TestSplit(t *testing.T) {
// 	got := Split("a:b:c", ":")
// 	want := []string{"a", "b", "c"}
// 	if !reflect.DeepEqual(want, got) {
// 		t.Errorf("execepted: %v, got: %v", want, got) // 测试失败输出错误的提示
// 	}
// }

// func TestMoreSplit(t *testing.T) {
// 	got := Split("abcd", "bc")
// 	want := []string{"a", "d"}
// 	if !reflect.DeepEqual(want, got) {
// 		t.Errorf("excepted:%v, got:%v", want, got)
// 	}
// 	println(strings.Join(got, ""))
// 	println(strings.Join(want, ""))
// }

// // 测试一下split函数对中文字符串的支持
// func TestChineseSplit(t *testing.T) {
// 	// 定义一个测试用例类型
// 	type test struct {
// 		input string
// 		sep   string
// 		want  []string
// 	}

// 	tests := []test{
// 		{input: "a:b:c", sep: ":", want: []string{"a", "b", "c"}},
// 		{input: "a:b:c", sep: ",", want: []string{"a:b:c"}},
// 		{input: "abcd", sep: "bc", want: []string{"a", "d"}},
// 		{input: "枯藤老鼠昏鸦", sep: "老", want: []string{"枯藤", "鼠昏鸦"}},
// 	}

// 	// 遍历切片，逐一执行测试用例
// 	for _, tc := range tests {
// 		got := Split(tc.input, tc.sep)
// 		if !reflect.DeepEqual(got, tc.want) {
// 			t.Errorf("excepted:%#v, got:%#v", tc.want, got)
// 		}
// 	}
// }

// func TestChineseSplit2(t *testing.T) {
// 	type test struct {
// 		input string
// 		sep   string
// 		want  []string
// 	}
// 	tests := map[string]test{
// 		"simple":      {input: "a:b:c", sep: ":", want: []string{"a", "b", "c"}},
// 		"wrong sep":   {input: "a:b:c", sep: ",", want: []string{"a:b:c"}},
// 		"more sep":    {input: "abcd", sep: "bc", want: []string{"a", "d"}},
// 		"leading sep": {input: "枯藤老树昏鸦", sep: "老", want: []string{"枯藤", "树昏鸦"}},
// 	}

// 	for name, tc := range tests {
// 		got := Split(tc.input, tc.sep)
// 		if !reflect.DeepEqual(got, tc.want) {
// 			t.Errorf("name:%s excepted: %#v got: %#v", name, tc.want, got) // 将测试用例的name格式化输出
// 		}
// 	}
// }

// func TestChineseSplit3(t *testing.T) {
// 	type test struct {
// 		input string
// 		sep   string
// 		want  []string
// 	}

// 	tests := map[string]test{
// 		"simple":      {input: "a:b:c", sep: ":", want: []string{"a", "b", "c"}},
// 		"wrong sep":   {input: "a:b:c", sep: ",", want: []string{"a:b:c"}},
// 		"more sep":    {input: "abcd", sep: "bc", want: []string{"a", "d"}},
// 		"leading sep": {input: "枯藤老树昏鸦", sep: "老", want: []string{"枯藤", "树昏鸦"}},
// 	}

// 	for name, tc := range tests {
// 		t.Run(name, func(t *testing.T) {
// 			got := Split(tc.input, tc.sep)
// 			if !reflect.DeepEqual(got, tc.want) {
// 				t.Errorf("excepted: %#v, got: %#v", tc.want, got)
// 			}
// 		})
// 	}
// }

func BenchmarkSplit(b *testing.B) {
	for i := 0; i < b.N; i++ {
		Split("枯藤老树昏鸦", "老")
	}
}
