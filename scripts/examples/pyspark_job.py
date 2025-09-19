from pyspark.sql import SparkSession

spark = SparkSession.builder.master("local[*]").appName("example").getOrCreate()
df = spark.createDataFrame([(1, "alpha"), (2, "beta")], ["id", "label"])
df.show()
spark.stop()
